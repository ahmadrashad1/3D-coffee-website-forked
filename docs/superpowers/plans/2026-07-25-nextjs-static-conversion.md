# Next.js Static Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the existing static EMBER coffee site (`index.html`, `menu.html`, `styles.css`, `main.js`) into a Next.js 15 App Router project that builds to fully static HTML via `output: "export"`, deployable on Vercel, with identical visual output and behavior.

**Architecture:** Two routes (`app/page.tsx`, `app/menu/page.tsx`) share `components/Nav.tsx`, `components/Footer.tsx`, and `components/SiteScripts.tsx` (a client component porting the two small inline `<script>` blocks). The canvas scroll-film engine (`main.js`, ~270 lines) is not rewritten — it moves to `public/main.js` unchanged except for one asset-path fix, and loads via `next/script` only on the homepage. All static assets move under `public/`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, no CSS framework — the existing hand-written `styles.css` becomes `app/globals.css` verbatim (plus one path fix).

## Global Constraints

- `output: "export"` in `next.config.ts` — the build must produce plain static files in `out/`, no Node server required at runtime. (Spec: "Architecture")
- No `next/image`, no CSS Modules, no Tailwind — plain `<img>` tags and the existing global CSS, to minimize visual-regression risk. (Spec: "Explicitly out of scope")
- `main.js` (the canvas scroll engine) is ported verbatim, not rewritten in React. (Spec: "Scripts")
- Every asset reference (`<img src>`, the frame-manifest fetch, CSS `url(...)`) must be root-absolute (e.g. `/images/hero.webp`), because `/menu` is a real route and relative paths would resolve incorrectly there. (Spec: "Asset path handling")
- No new pages, features, or content changes — structural port only. (Spec: "Explicitly out of scope")

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: a working `npm run dev` / `npm run build` toolchain that later tasks build on. No app code yet.

- [ ] **Step 1: Initialize package.json and install dependencies**

Run:
```bash
npm init -y
npm install next react react-dom
npm install -D typescript @types/node @types/react @types/react-dom
```
Expected: `node_modules/` created, `package.json` now lists `next`, `react`, `react-dom` under `dependencies` and `typescript`/`@types/*` under `devDependencies`.

- [ ] **Step 2: Set package.json scripts**

Edit `package.json` so the `"scripts"` key is exactly:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "serve": "npx serve out"
  }
}
```
(Leave `name`, `version`, `dependencies`, `devDependencies` as npm generated them.)

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Update .gitignore for Next.js build output**

Add these three lines to the end of `.gitignore` (the file already ends with `padel-website/`):
```
.next/
out/
next-env.d.ts
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json .gitignore
git commit -m "Scaffold Next.js project config for static export"
```

---

### Task 2: Move static assets into public/

**Files:**
- Create: `public/images/*` (copied from `images/`)
- Create: `public/frames24/*` (copied from `frames24/`)
- Create: `public/frames/frames.json` (copied from `frames/frames.json`, with path fix)
- Modify: `tools/build_frames.py`

**Interfaces:**
- Produces: `/images/*.{webp,jpg,png}`, `/frames24/frame_%04d.webp`, `/frames/frames.json` (with `pattern` field `"/frames24/frame_%04d.webp"`) — all served at the site root once Next.js runs, since anything under `public/` is served from `/`.

- [ ] **Step 1: Copy assets into public/**

```bash
mkdir -p public/images public/frames24 public/frames
cp images/*.webp images/*.jpg images/*.png public/images/
cp frames24/*.webp public/frames24/
cp frames/frames.json public/frames/frames.json
```
Expected: `ls public/images | wc -l` reports 9 files; `ls public/frames24 | wc -l` reports 192 files.

- [ ] **Step 2: Fix the root-relative pattern in the copied manifest**

Edit `public/frames/frames.json` so it reads exactly:
```json
{
  "count": 192,
  "pattern": "/frames24/frame_%04d.webp"
}
```
(Only the `pattern` value changes — added leading `/`.)

- [ ] **Step 3: Update tools/build_frames.py to output into public/**

In `tools/build_frames.py`, change:
```python
FRAMES_DIR = ROOT / "frames24"
MANIFEST = ROOT / "frames" / "frames.json"
```
to:
```python
FRAMES_DIR = ROOT / "public" / "frames24"
MANIFEST = ROOT / "public" / "frames" / "frames.json"
```

And change the `write_manifest` function's pattern string from:
```python
json.dumps({"count": count, "pattern": "frames24/frame_%04d.webp"}, indent=2) + "\n"
```
to:
```python
json.dumps({"count": count, "pattern": "/frames24/frame_%04d.webp"}, indent=2) + "\n"
```
This keeps the frame-export script consistent with the new asset location, so future re-exports (e.g. after re-running it against the source video) write to the right place with the right path.

- [ ] **Step 4: Verify the manifest is valid JSON with the right count**

Run: `python -c "import json; d=json.load(open('public/frames/frames.json')); print(d['count'], d['pattern'])"`
Expected output: `192 /frames24/frame_%04d.webp`

- [ ] **Step 5: Commit**

```bash
git add public/images public/frames24 public/frames tools/build_frames.py
git commit -m "Move static assets into public/ for Next.js"
```

---

### Task 3: Port main.js into public/main.js

**Files:**
- Create: `public/main.js` (copied from `main.js`, one path fix)

**Interfaces:**
- Consumes: `/frames/frames.json` (produced by Task 2), DOM elements with ids `film`, `track`, `loader`, `loadbar`, `scroll-cue`, class `caption` (produced by Task 8's homepage markup).
- Produces: the canvas scroll-film behavior on the homepage, loaded via `next/script` in Task 8. No exports — this is a plain script relying on global DOM queries, unchanged from today.

- [ ] **Step 1: Copy main.js into public/**

```bash
cp main.js public/main.js
```

- [ ] **Step 2: Fix the manifest fetch path**

In `public/main.js`, change:
```js
async function loadManifest() {
  const res = await fetch("frames/frames.json");
```
to:
```js
async function loadManifest() {
  const res = await fetch("/frames/frames.json");
```
This is the only change to this file — `frameURL()` already builds URLs from `state.pattern`, which now already contains the leading slash from Task 2's manifest fix, so no other line needs to change.

- [ ] **Step 3: Verify the diff is exactly the one-line change**

Run: `diff main.js public/main.js`
Expected output:
```
47c47
<   const res = await fetch("frames/frames.json");
---
>   const res = await fetch("/frames/frames.json");
```

- [ ] **Step 4: Commit**

```bash
git add public/main.js
git commit -m "Port main.js into public/ with root-absolute manifest fetch"
```

---

### Task 4: Create globals.css and the root layout

**Files:**
- Create: `app/globals.css` (copied from `styles.css`, one path fix)
- Create: `app/layout.tsx`

**Interfaces:**
- Produces: `RootLayout` component wrapping every page, importing the global stylesheet and setting default `<html>`/`<body>` structure plus base `metadata`/`viewport`. Later page components (Tasks 8, 9) render inside this layout's `children`.

- [ ] **Step 1: Copy styles.css into app/globals.css**

```bash
mkdir -p app
cp styles.css app/globals.css
```

- [ ] **Step 2: Fix the reduced-motion background image path**

In `app/globals.css`, inside the `@media(prefers-reduced-motion:reduce)` block near the end of the file, change:
```css
#stage{position:relative;background:url('images/hero.webp') center/cover no-repeat}
```
to:
```css
#stage{position:relative;background:url('/images/hero.webp') center/cover no-repeat}
```
This is the only change to this file — every other selector in `styles.css` (including the `.about-hero`, `.menu-*`, `#brandnav.nav-dark` rules added this session) carries over unchanged.

- [ ] **Step 3: Verify the diff is exactly the one-line change**

Run: `diff styles.css app/globals.css`
Expected output:
```
37c37
< @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}#track{height:100vh}#stage{position:relative;background:url('images/hero.webp') center/cover no-repeat}#film{display:none}.caption{display:none}.caption:first-of-type{display:block;opacity:1!important;transform:translate(-50%,-50%)!important}[data-reveal]{opacity:1;transform:none}}
---
> @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}#track{height:100vh}#stage{position:relative;background:url('/images/hero.webp') center/cover no-repeat}#film{display:none}.caption{display:none}.caption:first-of-type{display:block;opacity:1!important;transform:translate(-50%,-50%)!important}[data-reveal]{opacity:1;transform:none}}
```

- [ ] **Step 4: Create app/layout.tsx**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMBER Coffee",
  description:
    "EMBER is coffee for mornings already in motion—roasted with depth and made to travel.",
  metadataBase: new URL("https://ember.coffee"),
};

export const viewport: Viewport = {
  themeColor: "#171411",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```
Note: `metadataBase` uses `https://ember.coffee` as a placeholder domain, matching the fictional-brand convention already used throughout this codebase (e.g. `hello@ember.coffee`). It's only used to resolve relative OG image URLs during build — replace it with a real domain before this ever goes live.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "Add globals.css and root layout"
```

---

### Task 5: Create the Nav component

**Files:**
- Create: `components/Nav.tsx`

**Interfaces:**
- Consumes: nothing external.
- Produces: `export default function Nav({ variant }: { variant: "home" | "menu" })`. Renders `<nav id="brandnav">` — `id="brandnav"` and the `data-bg`/`nav-dark`/`on` class contract are relied on by `components/SiteScripts.tsx` (Task 7) and `app/globals.css`'s `#brandnav*` rules (Task 4).

- [ ] **Step 1: Create components/Nav.tsx**

```tsx
import Link from "next/link";

export default function Nav({ variant }: { variant: "home" | "menu" }) {
  const base = variant === "menu" ? "/" : "";
  return (
    <nav
      id="brandnav"
      className={variant === "menu" ? "nav-dark" : undefined}
      aria-label="Primary navigation"
    >
      <Link className="wordmark" href={variant === "menu" ? "/" : "#top"}>
        <strong>EMBER</strong>
        <small>ROASTERS</small>
      </Link>
      <div className="links">
        <Link href={`${base}#story`}>Our coffee</Link>
        <Link href={`${base}#craft`}>The roast</Link>
        <Link href={`${base}#gallery`}>Journal</Link>
        <Link href="/menu">Menu</Link>
        <Link href={`${base}#about`}>About</Link>
        <a href="mailto:hello@ember.coffee">Contact</a>
      </div>
      <Link className="navcta" href={`${base}#reserve`}>
        Order ahead
      </Link>
    </nav>
  );
}
```

Per-page link behavior this produces (matches the current site exactly, except `menu.html` → `/menu` and `index.html` → `/`, which is the expected routing change):
- `variant="home"`: wordmark → `#top`, links → `#story` / `#craft` / `#gallery` / `/menu` / `#about`, CTA → `#reserve`.
- `variant="menu"`: wordmark → `/`, links → `/#story` / `/#craft` / `/#gallery` / `/menu` / `/#about`, CTA → `/#reserve`, and the nav renders with `nav-dark` applied immediately (no flash of light-on-light text before `SiteScripts` runs, since the menu page's background is uniformly light).

- [ ] **Step 2: Commit**

```bash
git add components/Nav.tsx
git commit -m "Add shared Nav component"
```

---

### Task 6: Create the Footer component

**Files:**
- Create: `components/Footer.tsx`

**Interfaces:**
- Consumes: nothing external.
- Produces: `export default function Footer({ variant }: { variant: "home" | "menu" })`. Renders `<footer data-bg="dark">` on the homepage only — relied on by `components/SiteScripts.tsx`'s dark-zone detection (Task 7).

- [ ] **Step 1: Create components/Footer.tsx**

```tsx
import Link from "next/link";

export default function Footer({ variant }: { variant: "home" | "menu" }) {
  const base = variant === "menu" ? "/" : "";
  return (
    <footer data-bg={variant === "home" ? "dark" : undefined}>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-mark">EMBER</div>
            <p className="footer-tag">Coffee for mornings already in motion.</p>
          </div>
          <div className="footer-col">
            <h3>Explore</h3>
            <Link href={`${base}#story`}>Our story</Link>
            <Link href={`${base}#craft`}>The roast</Link>
            <Link href={`${base}#blend`}>The blend</Link>
            <Link href="/menu">Menu</Link>
          </div>
          <div className="footer-col">
            <h3>Visit</h3>
            <Link href={`${base}#gallery`}>Journal</Link>
            <a href="mailto:hello@ember.coffee">Cafés</a>
            <a href="mailto:hello@ember.coffee">Stockists</a>
          </div>
          <div className="footer-col">
            <h3>Follow</h3>
            <a href="mailto:hello@ember.coffee">Instagram</a>
            <a href="mailto:hello@ember.coffee">Contact</a>
            <a href="mailto:hello@ember.coffee">Wholesale</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 EMBER Coffee</span>
          <span>Roasted slowly · carried daily</span>
        </div>
      </div>
    </footer>
  );
}
```

Note: today's `menu.html` footer is missing the "The blend" link that `index.html`'s footer has (a pre-existing inconsistency from when `menu.html` was built). This shared component adds it to both variants — the only deliberate content change in this port, made so one component can serve both pages without a content-shape branch. Everything else is byte-equivalent to today's rendered output, modulo the `base` link-prefix change already covered in Task 5.

- [ ] **Step 2: Commit**

```bash
git add components/Footer.tsx
git commit -m "Add shared Footer component"
```

---

### Task 7: Create the SiteScripts client component

**Files:**
- Create: `components/SiteScripts.tsx`

**Interfaces:**
- Consumes: DOM elements produced by Task 5 (`#brandnav`), Task 8/9 (`[data-reveal]` elements, `#track` on the homepage only), and Tasks 5/6/8 (`[data-bg="dark"]` elements — `#stage`, `.manifesto`, `.roast-panel`, `.gallery`, `.about-hero`, and `Footer`'s `<footer>` when `variant="home"`).
- Produces: `export default function SiteScripts()` — renders nothing (`return null`), only registers scroll/intersection listeners on mount. Rendered once per page in Tasks 8 and 9.

- [ ] **Step 1: Create components/SiteScripts.tsx**

```tsx
"use client";

import { useEffect } from "react";

export default function SiteScripts() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (entry) => entry.isIntersecting && entry.target.classList.add("in")
        ),
      { threshold: 0.14 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const revealNow = () => {
      document.querySelectorAll("[data-reveal]:not(.in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          el.classList.add("in");
        }
      });
    };
    window.addEventListener("scroll", revealNow, { passive: true });
    revealNow();

    const nav = document.getElementById("brandnav");
    const filmEnd = () =>
      (document.getElementById("track")?.offsetHeight ?? window.innerHeight * 3) -
      window.innerHeight;
    const toggleOn = () =>
      nav?.classList.toggle("on", window.scrollY > filmEnd() * 0.96);
    window.addEventListener("scroll", toggleOn, { passive: true });

    const darkZones = [
      ...document.querySelectorAll<HTMLElement>('[data-bg="dark"]'),
    ];
    const updateNavTheme = () => {
      if (!nav) return;
      const navH = nav.offsetHeight;
      const overDark = darkZones.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top < navH && r.bottom > 0;
      });
      nav.classList.toggle("nav-dark", !overDark);
    };
    window.addEventListener("scroll", updateNavTheme, { passive: true });
    updateNavTheme();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", revealNow);
      window.removeEventListener("scroll", toggleOn);
      window.removeEventListener("scroll", updateNavTheme);
    };
  }, []);

  return null;
}
```

This is a verbatim logic port of both inline `<script>` blocks that currently exist at the bottom of `index.html` (reveal observer + `.on` toggle + `nav-dark` theme toggle) and `menu.html` (reveal observer + `.on` toggle only). On the menu page, `darkZones` will always be empty (no `[data-bg="dark"]` elements exist there), so `updateNavTheme` harmlessly re-confirms the `nav-dark` class that `Nav` (Task 5) already applies statically for `variant="menu"`.

- [ ] **Step 2: Commit**

```bash
git add components/SiteScripts.tsx
git commit -m "Add SiteScripts client component"
```

---

### Task 8: Create the homepage (app/page.tsx)

**Files:**
- Create: `app/page.tsx`

**Interfaces:**
- Consumes: `Nav` (Task 5), `Footer` (Task 6), `SiteScripts` (Task 7), `/main.js` (Task 3).
- Produces: the `/` route. This is the full homepage — hero film, all content sections, and the About block — matching `index.html`'s `<body>` content (minus nav/footer, now components).

- [ ] **Step 1: Create app/page.tsx**

```tsx
import type { Metadata } from "next";
import Script from "next/script";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";

export const metadata: Metadata = {
  title: "EMBER — Carry the ritual",
  description:
    "EMBER is coffee for mornings already in motion—roasted with depth and made to travel.",
  openGraph: {
    title: "EMBER — Carry the ritual",
    description: "A considered coffee ritual for mornings already in motion.",
    images: ["/images/hero.webp"],
  },
};

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#story">
        Skip to brand story
      </a>
      <div id="loader" aria-live="polite">
        <div className="loader-mark">EMBER</div>
        <div className="loader-line">
          <i id="loadbar"></i>
        </div>
        <span className="loader-copy">Preparing your ritual</span>
      </div>
      <Nav variant="home" />
      <div id="track">
        <div id="stage" data-bg="dark">
          <canvas
            id="film"
            aria-label="Coffee cup film controlled by scrolling"
          ></canvas>
          <div id="vignette"></div>
          <div id="grain"></div>
          <div
            className="caption cap-center"
            data-in="-0.05"
            data-hold="0.025"
            data-out="0.075"
          >
            <p className="eyebrow">Small-batch coffee · Est. 2026</p>
            <h1>
              EMBER
              <em>Coffee</em>
            </h1>
            <p>Carry the ritual.</p>
          </div>
          <div
            className="caption cap-left"
            data-in="0.03"
            data-hold="0.07"
            data-out="0.12"
          >
            <p className="eyebrow">01 · Begin</p>
            <h2>
              Start with
              <em>something real.</em>
            </h2>
            <p>Roasted for depth. Built for the first quiet minute.</p>
          </div>
          <div
            className="caption cap-right"
            data-in="0.15"
            data-hold="0.25"
            data-out="0.37"
          >
            <p className="eyebrow">02 · Open</p>
            <h2>
              The lid lifts.
              <em>The day opens.</em>
            </h2>
            <p>A small ritual, made to travel well.</p>
          </div>
          <div
            className="caption cap-left"
            data-in="0.42"
            data-hold="0.50"
            data-out="0.58"
          >
            <p className="eyebrow">03 · Hold</p>
            <h2>
              Warmth,
              <em>held close.</em>
            </h2>
            <p>Quiet materials. A cup made to stay in your hand.</p>
          </div>
          <div
            className="caption cap-right"
            data-in="0.60"
            data-hold="0.68"
            data-out="0.76"
          >
            <p className="eyebrow">04 · Taste</p>
            <h2>
              Deep roast.
              <em>Clean finish.</em>
            </h2>
            <p>Cacao, toasted sugar, and a measured edge.</p>
          </div>
          <div
            className="caption cap-left"
            data-in="0.78"
            data-hold="0.86"
            data-out="0.94"
          >
            <p className="eyebrow">05 · Move</p>
            <h2>
              For mornings
              <em>in motion.</em>
            </h2>
            <p>Make the everyday feel considered.</p>
          </div>
          <div id="scroll-cue">Scroll to explore</div>
        </div>
      </div>
      <main id="story">
        <section className="section manifesto" data-bg="dark">
          <span className="manifesto-index">01 / 05</span>
          <div className="manifesto-inner">
            <div data-reveal>
              <p className="kicker">The philosophy</p>
              <h2 className="display">
                Coffee should <em>follow you.</em>
              </h2>
            </div>
            <p className="lead" data-reveal>
              EMBER began with a simple belief: the coffee you carry should
              feel as intentional as the coffee you sit down for. Deeply
              roasted, quietly designed, always ready to move.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="feature">
            <div className="visual" data-reveal>
              <img
                src="/images/coffee-shop.jpg"
                alt="EMBER coffee cup in warm light"
                loading="lazy"
              />
            </div>
            <div className="feature-copy" data-reveal>
              <div className="section-no">02 · Origin</div>
              <p className="kicker">Made for the first minute</p>
              <h2>
                A slower start
                <br />
                <em>to moving days.</em>
              </h2>
              <p className="lead">
                Small-batch beans meet precise roasting and a generous
                finish. The result is coffee with presence—rich enough to
                wake you, balanced enough to stay with you.
              </p>
              <a className="text-link" href="#blend">
                Meet the blend
              </a>
            </div>
          </div>
        </section>
        <section className="section" id="craft">
          <div className="feature reverse">
            <div className="visual" data-reveal>
              <img
                src="/images/coffee-image.jpg"
                alt="Roasted coffee beans around the EMBER cup"
                loading="lazy"
              />
            </div>
            <div className="feature-copy" data-reveal>
              <div className="section-no">03 · Craft</div>
              <p className="kicker">Roasted with restraint</p>
              <h2>
                Depth without
                <br />
                <em>the heaviness.</em>
              </h2>
              <p className="lead">
                We develop sweetness first: cacao, toasted sugar, and a
                gentle fruit brightness. The finish stays clean, whether you
                drink it black or soften it with milk.
              </p>
              <a className="text-link" href="#gallery">
                See the ritual
              </a>
            </div>
          </div>
        </section>
        <div className="roast-panel" data-bg="dark">
          <section className="section">
            <div data-reveal>
              <p className="kicker">Tasting notes</p>
              <h2 className="display">
                Dark, warm,
                <br />
                <em>quietly bright.</em>
              </h2>
              <p className="lead">
                A medium-dark profile built for everyday brewing—structured,
                soft, and never overworked.
              </p>
            </div>
            <div className="notes" data-reveal>
              <div className="note">
                <strong>Cacao</strong>
                <span>Foundation</span>
              </div>
              <div className="note">
                <strong>Toffee</strong>
                <span>Sweetness</span>
              </div>
              <div className="note">
                <strong>Red plum</strong>
                <span>Finish</span>
              </div>
            </div>
          </section>
        </div>
        <section className="section blend" id="blend">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">The daily blend</p>
              <h2 className="display">
                One roast.
                <br />
                <em>Every ritual.</em>
              </h2>
            </div>
            <p className="lead">
              Built to perform across espresso, filter, and the cup you take
              with you. Freshly roasted and packed in small runs.
            </p>
          </div>
          <div className="spec-list" data-reveal>
            <div className="spec-row">
              <span>01</span>
              <strong>Profile</strong>
              <span>Dark chocolate · toasted sugar · red plum</span>
            </div>
            <div className="spec-row">
              <span>02</span>
              <strong>Roast</strong>
              <span>Medium-dark, developed for sweetness</span>
            </div>
            <div className="spec-row">
              <span>03</span>
              <strong>Origin</strong>
              <span>Seasonal single-estate lots</span>
            </div>
            <div className="spec-row">
              <span>04</span>
              <strong>Format</strong>
              <span>Whole bean · ground to order</span>
            </div>
          </div>
        </section>
        <section className="section gallery" id="gallery" data-bg="dark">
          <div className="gallery-grid">
            <figure className="tall">
              <img
                src="/images/detail-lid.webp"
                alt="EMBER cup lid lifting"
                loading="lazy"
              />
              <figcaption>01 · The opening</figcaption>
            </figure>
            <figure>
              <img
                src="/images/detail-beans.webp"
                alt="Coffee beans in warm light"
                loading="lazy"
              />
              <figcaption>02 · The roast</figcaption>
            </figure>
            <figure>
              <img
                src="/images/gallery-final.webp"
                alt="EMBER coffee cup hero view"
                loading="lazy"
              />
              <figcaption>03 · The ritual</figcaption>
            </figure>
          </div>
        </section>
        <section className="section quote">
          <div data-reveal>
            <p className="kicker">Words from the counter</p>
            <blockquote>
              “A coffee ritual with the volume turned down.”
            </blockquote>
            <cite>Early owner · Lisbon</cite>
          </div>
        </section>
        <section className="cta-band" id="reserve">
          <div className="cta-band-inner">
            <div data-reveal>
              <p className="kicker">Your next cup</p>
              <h2 className="display">
                Carry the <em>ritual.</em>
              </h2>
            </div>
            <div className="cta-band-actions" data-reveal>
              <p className="lead">
                Freshly roasted. Packed in small batches. Ready for wherever
                morning takes you.
              </p>
              <a
                className="cta"
                href="mailto:hello@ember.coffee?subject=EMBER%20coffee"
              >
                Shop the blend
              </a>
            </div>
          </div>
        </section>
        <div className="about-hero" id="about" data-bg="dark">
          <section className="section">
            <div className="feature">
              <div className="visual" data-reveal>
                <img
                  src="/images/coffee-barista.jpg"
                  alt="EMBER barista preparing coffee behind the counter"
                  loading="lazy"
                />
              </div>
              <div className="feature-copy" data-reveal>
                <div className="section-no">About · EMBER</div>
                <p className="kicker">Behind the counter</p>
                <h2 className="display">
                  It&apos;s our pleasure
                  <br />
                  <em>serving you the best coffee in town.</em>
                </h2>
                <p className="lead">
                  Behind every order is a barista who&apos;s tasted the
                  batch, dialed the grind, and knows exactly what a good
                  morning should taste like. That care is the actual
                  product.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer variant="home" />
      <Script src="/main.js" strategy="afterInteractive" />
      <SiteScripts />
    </>
  );
}
```

Note: apostrophes in "It's" and "who's" are written as `&apos;` — JSX requires this for literal apostrophes in text content (an unescaped `'` compiles fine in some tooling but trips the `react/no-unescaped-entities` lint rule; `&apos;` avoids that entirely).

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "Port homepage to app/page.tsx"
```

---

### Task 9: Create the menu page (app/menu/page.tsx)

**Files:**
- Create: `app/menu/page.tsx`

**Interfaces:**
- Consumes: `Nav` (Task 5), `Footer` (Task 6), `SiteScripts` (Task 7).
- Produces: the `/menu` route, matching `menu.html`'s content exactly (13 menu rows across 4 categories).

- [ ] **Step 1: Create app/menu/page.tsx**

```tsx
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";

export const metadata: Metadata = {
  title: "Menu — EMBER Coffee",
  description:
    "The EMBER menu — espresso, filter, cold brew, and pastries from small-batch, seasonal lots.",
  openGraph: {
    title: "Menu — EMBER Coffee",
    description: "Espresso, filter, cold brew, and pastries — order at the counter.",
    images: ["/images/hero.webp"],
  },
};

export default function MenuPage() {
  return (
    <>
      <a className="skip-link" href="#menu-content">
        Skip to menu
      </a>
      <Nav variant="menu" />
      <main id="menu-content">
        <section className="section">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">The menu</p>
              <h1 className="display">
                Order at
                <br />
                <em>the counter.</em>
              </h1>
            </div>
            <p className="lead">
              Small-batch, seasonal, and made to order — whether
              you&apos;re staying in or carrying it with you.
            </p>
          </div>

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Espresso</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Espresso</strong>
                  <span className="menu-desc">
                    Single or double shot, pulled to order.
                  </span>
                </div>
                <span className="menu-price">$3.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Cortado</strong>
                  <span className="menu-desc">
                    Espresso softened with warm milk, equal parts.
                  </span>
                </div>
                <span className="menu-price">$4.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Cappuccino</strong>
                  <span className="menu-desc">
                    Espresso, steamed milk, a proper cap of foam.
                  </span>
                </div>
                <span className="menu-price">$5.00</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Flat White</strong>
                  <span className="menu-desc">
                    Double ristretto, microfoam, no nonsense.
                  </span>
                </div>
                <span className="menu-price">$5.25</span>
              </div>
            </div>
          </div>

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Filter</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Pour Over</strong>
                  <span className="menu-desc">
                    Today&apos;s single-estate lot, brewed to order.
                  </span>
                </div>
                <span className="menu-price">$5.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Batch Brew</strong>
                  <span className="menu-desc">
                    Our house blend, always fresh, always on.
                  </span>
                </div>
                <span className="menu-price">$3.75</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Drip</strong>
                  <span className="menu-desc">
                    Classic filter coffee, brewed by the pot.
                  </span>
                </div>
                <span className="menu-price">$3.25</span>
              </div>
            </div>
          </div>

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Cold Brew</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Cold Brew</strong>
                  <span className="menu-desc">
                    Steeped 18 hours, served over ice.
                  </span>
                </div>
                <span className="menu-price">$5.00</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Iced Latte</strong>
                  <span className="menu-desc">
                    Espresso, cold milk, plenty of ice.
                  </span>
                </div>
                <span className="menu-price">$5.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Sparkling Cold Brew</strong>
                  <span className="menu-desc">
                    Cold brew, soda, a citrus twist.
                  </span>
                </div>
                <span className="menu-price">$6.00</span>
              </div>
            </div>
          </div>

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Pastries</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Butter Croissant</strong>
                  <span className="menu-desc">Baked fresh each morning.</span>
                </div>
                <span className="menu-price">$3.75</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Almond Financier</strong>
                  <span className="menu-desc">
                    Toasted almond, brown butter.
                  </span>
                </div>
                <span className="menu-price">$4.00</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Banana Bread</strong>
                  <span className="menu-desc">
                    Studded with toasted walnuts.
                  </span>
                </div>
                <span className="menu-price">$4.25</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/menu/page.tsx
git commit -m "Port menu page to app/menu/page.tsx"
```

---

### Task 10: Build and verify

**Files:** None created or modified — this task only runs and inspects the build.

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: `out/` — the final static site, and a verification record that it matches the current site's behavior.

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: exits 0, prints a route summary including `/` and `/menu`, and creates `out/index.html` and `out/menu.html`.

- [ ] **Step 2: Verify the expected files exist**

Run: `ls out/index.html out/menu.html out/main.js out/frames/frames.json && ls out/frames24 | wc -l`
Expected: both HTML files listed, `main.js` and `frames.json` present, and the frame count prints `192`.

- [ ] **Step 3: Serve the build and smoke-test both pages with curl**

Run:
```bash
npx serve out -l 4300 &
sleep 1
curl -s http://localhost:4300/ | grep -o '<title>[^<]*</title>'
curl -s http://localhost:4300/menu | grep -o '<title>[^<]*</title>'
curl -s http://localhost:4300/ | grep -c 'data-bg="dark"'
curl -s http://localhost:4300/menu | grep -c 'class="nav-dark"'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4300/frames/frames.json
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4300/main.js
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4300/images/coffee-barista.jpg
```
Expected:
- `<title>EMBER — Carry the ritual</title>`
- `<title>Menu — EMBER Coffee</title>`
- `6` (the five `data-bg="dark"` zones in `app/page.tsx` — `#stage`, `.manifesto`, `.roast-panel`, `.gallery`, `.about-hero` — plus the homepage `Footer`'s `<footer data-bg="dark">`; if it's not `6`, stop and investigate before proceeding)
- `1` (the menu page's statically-dark nav)
- `200` for all three asset requests

- [ ] **Step 4: If browser automation tools are available, do a visual pass**

Navigate to `http://localhost:4300/`, wait for the loader to complete, scroll through the full page, and confirm: the canvas scrubs frames with scroll, captions fade in/out, the nav switches between light and dark text across sections (matching the behavior verified manually earlier this session), and the About section shows the barista image. Then navigate to `http://localhost:4300/menu` and confirm all 4 categories/13 rows render with a dark, legible nav throughout. This step is a nice-to-have visual confirmation on top of Step 3's deterministic checks — not required if no browser tool is available.

- [ ] **Step 5: Stop the server**

Run: `kill %1` (or find and kill the `serve` process by port if job control isn't available: check with `lsof -i :4300` / `netstat`, then kill the PID).

- [ ] **Step 6: No commit needed**

This task is verification-only; nothing changed. If any check in Steps 2–3 failed, fix the relevant task's files before moving on, re-run this task's steps, and commit the fix under that task's message convention.

---

### Task 11: Remove superseded static files and update the README

**Files:**
- Delete: `index.html`, `menu.html`, `styles.css`, `main.js`, `images/`, `frames24/`, `frames/`
- Modify: `README.md`

**Interfaces:** None — this is cleanup, no code depends on these paths anymore (Task 10 confirmed the Next.js build is self-sufficient under `public/` and `app/`).

- [ ] **Step 1: Remove the superseded root-level files and directories**

```bash
git rm index.html menu.html styles.css main.js
git rm -r images frames24 frames
```
Expected: git stages all deletions. (All of this is committed to git history from earlier in this session, so it remains fully recoverable if ever needed — this step does not delete it from history.)

- [ ] **Step 2: Update README.md**

Read the current `README.md` first, then replace its "Run locally" section (currently describing `python -m http.server 4189`) with:

```markdown
## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000/>.

## Build

```bash
npm run build
```

Produces a static export in `out/`, deployable to Vercel or any static host.
```

Keep the rest of the README (Asset pipeline, Content note sections) as-is, updating only file paths that moved: `frames24/frame_0001.webp` → `public/frames24/frame_0001.webp`, `frames/frames.json` → `public/frames/frames.json`, `images/` → `public/images/`, `main.js` → `public/main.js`.

- [ ] **Step 3: Verify nothing references the deleted paths**

Run: `grep -rn "images/\|frames24/\|frames/frames.json" --include="*.tsx" --include="*.ts" --include="*.css" app components 2>/dev/null | grep -v "/images/\|/frames24/\|/frames/frames.json"`
Expected: no output (empty) — meaning every remaining reference is already root-absolute (`/images/...`), not a bare relative path.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Remove superseded static files, update README for Next.js workflow"
```

---

### Task 12: Final full-project verification

**Files:** None.

**Interfaces:** None — final gate before calling the conversion done.

- [ ] **Step 1: Clean build from scratch**

```bash
rm -rf .next out
npm run build
```
Expected: exits 0, no warnings about missing files or broken imports.

- [ ] **Step 2: Re-run Task 10's curl smoke test**

Repeat Task 10 Step 3's commands against a fresh `npx serve out -l 4300`. Expected: identical results to Task 10.

- [ ] **Step 3: Confirm git status is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` (aside from the untracked `.playwright-mcp/` directory and loose screenshots already present before this work, which are unrelated to this conversion).
