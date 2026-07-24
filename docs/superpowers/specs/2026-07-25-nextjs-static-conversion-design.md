# Convert EMBER static site to a statically-exported Next.js app

## Goal

Move the existing static HTML/CSS/JS coffee site into a Next.js project so it can be deployed on Vercel, while keeping the output fully static — same visual result, same interactive scroll-film behavior, no backend or dynamic data introduced.

## Context

The site currently consists of two hand-written HTML pages (`index.html`, `menu.html`) that share a global stylesheet (`styles.css`) and a canvas-based scroll-film engine (`main.js`, ~250 lines of imperative DOM/canvas code driven by `window.scrollY`). There is no Node tooling, no `package.json`, no build step beyond the Python frame-export script (`tools/build_frames.py`). Static assets live in `images/`, `frames24/` (192 WebP frames), and `frames/frames.json` (the frame manifest `main.js` fetches at runtime).

## Architecture

- **Next.js 15, App Router, TypeScript.** App Router is the current standard for new Next.js projects; no reason to use the legacy Pages Router.
- **`output: 'export'`** in `next.config.ts`. This produces plain static HTML/CSS/JS in an `out/` directory at build time — deployable to Vercel or any static host, with no Node server required at runtime. This is the most literal interpretation of "keep it static" and was the user's explicit choice over Vercel's default hybrid SSG build.
- The Next.js project replaces the current flat file layout **at the repo root** (this repo is dedicated to this one site; Vercel's zero-config detection expects `package.json` at the root).

## File mapping

| Current | Becomes | Notes |
|---|---|---|
| `index.html` | `app/page.tsx` | Markup ported to JSX as-is; no re-architecting into smaller sections beyond Nav/Footer |
| `menu.html` | `app/menu/page.tsx` | Same treatment |
| Nav markup (duplicated in both HTML files today) | `components/Nav.tsx` | Takes props for the per-page differences: link targets (`#story` vs `index.html#story`), and whether `nav-dark` (static) applies (menu page) |
| Footer markup (duplicated today) | `components/Footer.tsx` | Same per-page link differences as props |
| `styles.css` | `app/globals.css` | Content unchanged, imported once in `app/layout.tsx` |
| `images/`, `frames24/`, `frames/` | `public/images/`, `public/frames24/`, `public/frames/` | Next.js serves `public/` at the site root |
| `main.js` | `public/main.js` | Unchanged logic; loaded via `next/script` |
| `tools/build_frames.py` | Stays at the same path | Build-time asset generator, unrelated to the Next.js runtime — but its hardcoded output paths (`FRAMES_DIR`, `MANIFEST`) get repointed at `public/frames24` / `public/frames`, since assets now live there. Without this, a future re-export would silently write to the deleted old location. |

## Scripts

`main.js` (the canvas scroll engine) is **not** rewritten into React — it works correctly today and rewriting it introduces real regression risk for no benefit. It moves to `public/main.js` verbatim and loads via `next/script` with `strategy="afterInteractive"`, which matches today's end-of-body `<script src="main.js">` timing (canvas element exists in the DOM before the script runs).

The two small inline scripts currently duplicated at the bottom of each HTML page — the `data-reveal` fade-in `IntersectionObserver`, and the nav dark/light theme logic (added this session, driven by `data-bg="dark"` markers) — are ported verbatim into a `components/SiteScripts.tsx` client component (`"use client"`, logic inside `useEffect`). This component is rendered on both pages; the nav-theme logic is a no-op on the menu page (no `[data-bg="dark"]` elements exist there), so no per-page branching is needed inside it.

## Asset path handling

Since `/menu` becomes a real route, every asset reference must be root-absolute (`/images/hero.webp`, not `images/hero.webp`) — a relative path on the menu page would otherwise resolve against `/menu/`. This applies to:
- All `<img src>` attributes in the ported JSX
- The `fetch("frames/frames.json")` and frame-URL pattern (`frames24/frame_%04d.webp`) inside `main.js`
- Any `url(...)` references inside `globals.css` (the `#grain` background is an inline data URI, so no change needed there; `prefers-reduced-motion` fallback references `images/hero.webp` and needs updating to `/images/hero.webp`)

## Explicitly out of scope

- No Tailwind, no CSS Modules, no `next/image` — plain `<img>` tags and the existing global CSS carry over untouched, to minimize visual-regression risk.
- No componentization of homepage sections beyond Nav/Footer (manifesto, feature blocks, roast-panel, blend, gallery, quote, cta-band, about-hero stay as inline JSX in `app/page.tsx`).
- No new pages, features, or content changes — this is a structural port only.
- No changes to `tools/build_frames.py` or the frame-export workflow.

## Migration cleanup

Once the Next.js pages are verified to match the current site, the superseded root-level files are removed: `index.html`, `menu.html`, `styles.css`, `main.js`, and the top-level `images/`, `frames24/`, `frames/` directories (now duplicated under `public/`). All of this is committed to git beforehand, so the old static site remains fully recoverable from history if needed.

## Dev workflow change

`python -m http.server 4189` is replaced by `npm run dev` (Next.js dev server, default port 3000). The README's "Run locally" section gets updated accordingly. The Python frame-export step (`python tools/build_frames.py <video>`) is unchanged and still run separately, before `npm run build`, whenever frames need regenerating.

## Verification plan

- `npm run build` succeeds and produces `out/`.
- Serve `out/` locally (e.g. `npx serve out`) and confirm via browser automation: homepage scroll-film works end-to-end (loader completes, frames scrub with scroll), all nav links resolve correctly on both pages, the About section and Menu page render correctly, and the nav dark/light theme switches correctly across every homepage section (the behavior verified manually earlier this session).
- Compare screenshots against the current static site's known-good screenshots for the same scroll positions, to catch layout regressions from the HTML→JSX port.
