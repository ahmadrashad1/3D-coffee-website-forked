# EMBER Coffee Scroll Site

An Apple-style scroll film built from the supplied coffee video. The opening film is scrubbed from 192 WebP frames at 24 fps, followed by a complete brand homepage with story, craft, blend details, gallery, CTA, navigation, and footer.

## Run locally

```bash
npm install
cp .env.example .env
docker compose up -d db
npx prisma migrate dev
npm run dev
```

`.env` needs a real `JWT_SECRET` (the copied `.env.example` only has a placeholder) — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste it in before starting the dev server.

Then open <http://localhost:3000/>.

## Build

```bash
npm run build
npm run start
```

Or build and run the full stack (app + Postgres) in Docker:

```bash
docker compose up --build
```

## Asset pipeline

- Source video: `assets/source-video.mp4` (ignored from git)
- Scroll frames: `public/frames24/frame_0001.webp` through `public/frames24/frame_0192.webp`
- Manifest: `public/frames/frames.json`
- Supporting crops: `public/images/`
- Scroll engine: `public/main.js`

The source film is 8 seconds at 1920×1080 / 24 FPS. Frames are exported at the source rate (24 fps) and 1400px width for smoother scroll scrubbing.

## Ordering demo

Sign up or log in (top-right nav) to add items — logged-out visitors can browse `/menu` but can't add to a cart. Carts are stored in Postgres per account, not in the browser. Once signed in, "Add to cart" on any menu item works normally; the cart (top-right nav icon) leads to `/checkout`, which posts to `POST /api/orders` — Postgres stores the order via Prisma, prices are always recomputed server-side from `lib/menu-data.ts`, and the order is linked to the signed-in account. `/order-confirmation/[id]` shows the receipt; `/admin/orders` lists every order ever placed, including which account placed it (no authentication on this page — demo only, not for production use).

Auth is a from-scratch implementation for this demo: passwords hashed with bcrypt, sessions as a signed JWT in an httpOnly cookie. No email verification, password reset, or OAuth yet.

## Content note

EMBER is a provisional concept brand. Replace the brand name, claims, CTA destination, and blend specifications before publishing as a real product site.
