# EMBER Coffee Scroll Site

An Apple-style scroll film built from the supplied coffee video. The opening film is scrubbed from 192 WebP frames at 24 fps, followed by a complete brand homepage with story, craft, blend details, gallery, CTA, navigation, and footer.

## Run locally

```bash
docker compose up -d db
npx prisma migrate dev
npm install
npm run dev
```

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

`/menu` has "Add to cart" on every item. The cart (top-right nav icon) leads to `/checkout`, which posts to `POST /api/orders` — Postgres stores the order via Prisma, prices are always recomputed server-side from `lib/menu-data.ts`. `/order-confirmation/[id]` shows the receipt; `/admin/orders` lists every order ever placed (no authentication — demo only, not for production use).

## Content note

EMBER is a provisional concept brand. Replace the brand name, claims, CTA destination, and blend specifications before publishing as a real product site.
