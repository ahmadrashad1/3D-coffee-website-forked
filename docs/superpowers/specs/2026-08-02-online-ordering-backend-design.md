# Add an online-ordering backend to the EMBER site for a client demo

## Goal

Give the client a working frontend-to-backend flow to look at: pick items from the Menu page, add them to a cart, submit an order through a real Next.js API route, and have it persisted in Postgres — provable via a simple admin page that lists submitted orders, not just a confirmation message. Demo-scoped: no payment, no auth, no email.

## Context

The site is currently a fully static Next.js export (`output: "export"`, deployed via Docker + nginx, no Node server at runtime — see [2026-07-25-nextjs-static-conversion-design.md](2026-07-25-nextjs-static-conversion-design.md)). Static export cannot run API routes at all. Making a real backend work requires switching Next.js to server mode, which changes the deployment story (Dockerfile, next.config.ts) as a direct consequence of adding a backend, not as separate scope creep.

Menu items currently live as hand-written JSX rows in `app/menu/page.tsx` — there's no shared data structure with stable ids/prices, which the cart and API both need.

## Architecture

- Next.js switches from `output: "export"` to `output: "standalone"` — a full server runtime (Route Handlers work), while still producing a lean, self-contained Docker image.
- **Prisma ORM** over **Postgres**, run as a sibling **Docker Compose** service for local/demo use (`postgres:16-alpine` + a named volume for persistence across restarts).
- Cart state lives entirely client-side (`CartContext`, React Context + `localStorage`) — no backend round-trip happens until the final checkout submission.
- One API route, `POST /api/orders`, is the entire backend surface. Order lookup (`/order-confirmation/[id]`) and the admin list (`/admin/orders`) are Server Components querying Prisma directly — no extra GET routes needed for those.

## Data model

`lib/menu-data.ts` — a plain TypeScript array, the single source of truth for menu items (`id`, `category`, `name`, `description`, `priceCents`), imported by both `app/menu/page.tsx` (rendering) and the cart/checkout code (pricing/display). The checkout POST payload sends only `{ menuItemId, quantity }` per line — the API re-derives each price from this file rather than trusting anything the client sends, so a tampered request can't order at a fake price.

Prisma schema (`prisma/schema.prisma`):

```prisma
model Order {
  id           Int         @id @default(autoincrement())
  customerName String
  contact      String
  pickupTime   String
  totalCents   Int
  createdAt    DateTime    @default(now())
  items        OrderItem[]
}

model OrderItem {
  id         Int    @id @default(autoincrement())
  orderId    Int
  order      Order  @relation(fields: [orderId], references: [id])
  menuItemId String
  name       String
  priceCents Int
  quantity   Int
}
```

`name` and `priceCents` on `OrderItem` are snapshots taken at order time, so a later edit to `lib/menu-data.ts` never rewrites the history of past orders.

## Cart & checkout flow (frontend)

- `components/CartContext.tsx` (`"use client"`) — Context + provider wrapping `{children}` in `app/layout.tsx`. State is `{ menuItemId, quantity }[]`, mirrored to `localStorage` on every change and hydrated from it on mount. Exposes `addItem`, `removeItem`, `setQuantity`, `clear`, `items`, and `totalCents` (computed by joining `items` against `lib/menu-data.ts`).
- `components/CartButton.tsx` (`"use client"`) — a small icon with an item-count badge, rendered inside `Nav.tsx`. Nav itself stays a Server Component; only this subtree needs client state. Clicking it opens `CartDrawer`.
- `components/CartDrawer.tsx` (`"use client"`) — a slide-in panel listing cart lines with quantity steppers, a remove control, a running total, and a "Checkout" button that navigates to `/checkout`.
- `app/menu/page.tsx` — refactored to map over `lib/menu-data.ts` grouped by category (replacing the hand-written rows); each row gets an "Add to cart" control wired to `CartContext`.
- `app/checkout/page.tsx` (`"use client"`, needs cart state) — an order summary pulled from `CartContext`, plus a form: name, contact, pickup time. Submits `{ customerName, contact, pickupTime, items: [{menuItemId, quantity}] }` to `POST /api/orders`. On success: clears the cart and navigates to `/order-confirmation/[id]`. On failure: shows an inline error and keeps the form filled in.
- `Nav.tsx`'s `navcta` ("Order ahead") and the homepage `cta-band`'s "Shop the blend" link both change from `mailto:hello@ember.coffee` to `/menu`.

## Backend

- `lib/prisma.ts` — the standard singleton `PrismaClient` pattern, guarding against connection exhaustion under Next.js dev-mode hot reload.
- `app/api/orders/route.ts` — `POST` handler:
  1. Parse the JSON body; return 400 if `customerName`, `contact`, or `pickupTime` is missing/blank, or `items` is missing/empty/not an array.
  2. For each `{menuItemId, quantity}`, look up the item in `lib/menu-data.ts`; return 400 if any `menuItemId` doesn't exist or `quantity < 1`.
  3. Compute `totalCents` server-side from the looked-up prices — never from client input.
  4. `prisma.order.create` with a nested `items: { create: [...] }` write (single transaction).
  5. Return `201` with `{ id, totalCents }`.
- `app/order-confirmation/[id]/page.tsx` — Server Component; `prisma.order.findUnique` including `items`; calls `notFound()` if the id doesn't exist; renders the order number, items, total, and pickup time.
- `app/admin/orders/page.tsx` — Server Component; `prisma.order.findMany` including `items`, ordered `createdAt desc`; rendered as a plain HTML table. **No authentication.** This is flagged explicitly both on the page itself (a small "demo only" note) and here, so it's never mistaken for a production-ready admin panel.

## Infrastructure changes

- `next.config.ts`: remove `output: "export"`; add `output: "standalone"`. The existing `allowedDevOrigins` LAN setting is unrelated and stays as-is.
- `Dockerfile`: rewritten to three stages — `deps` (`npm ci`), `builder` (`prisma generate` + `next build`), `runner` (`node:20-alpine`, copies the `.next/standalone` + `.next/static` + `public` output, `CMD ["node", "server.js"]`). The nginx runtime stage is removed entirely — Next.js's own server now handles requests directly.
- New `docker-compose.yml`: `app` service (build from the Dockerfile, `depends_on: db`, `DATABASE_URL` env) + `db` service (`postgres:16-alpine`, named volume `pgdata`, `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` env).
- `prisma/schema.prisma` plus a committed initial migration under `prisma/migrations/`. Applied via `npx prisma migrate deploy` as a startup step before `node server.js` inside the container, and via `npx prisma migrate dev` for local non-Docker development (run against `docker compose up -d db`).
- `nginx.conf` is deleted — nothing serves through it anymore (recoverable from git history if ever needed).
- `.env.example` documenting `DATABASE_URL=postgresql://user:password@localhost:5432/ember`.
- `README.md`: "Run locally" section updated to `docker compose up -d db` → `npx prisma migrate dev` → `npm run dev`; new "Ordering demo" section describing the cart → checkout → admin flow for whoever runs the demo.

## Error handling

- Checkout form: submit is disabled while the cart is empty; required fields are checked client-side before POSTing; a 400 response surfaces as an inline message above the submit button; a 500 shows a generic "Something went wrong, please try again" message.
- `/order-confirmation/[id]` on an unknown or invalid id: Next.js `notFound()` → the App Router's default 404 page.
- `/api/orders` never trusts client-sent prices or totals — both are always recomputed server-side from `lib/menu-data.ts`.

## Explicitly out of scope

- No payment processing — order form only, confirmed earlier in this design conversation.
- No authentication anywhere, including `/admin/orders`.
- No email/SMS order confirmations.
- No inventory/stock tracking, no order-status updates — orders are insert-only, no "preparing / ready / picked up" lifecycle.
- No changes to the scroll-film homepage content beyond the two CTA link targets listed above.
- Menu items stay in a static TS file, not database-backed — this demo is specifically about the *ordering* flow. A dynamic/admin-editable menu was considered and explicitly not chosen.

## Verification plan

- `npm run build` succeeds locally against a running `db` (`docker compose up -d db` with `DATABASE_URL` set in `.env`).
- `docker compose up --build` succeeds end-to-end: the app is reachable and migrations apply automatically on startup.
- Browser walkthrough: add several items to the cart from `/menu`, open the drawer, adjust quantities, check out with a name/contact/pickup time, land on `/order-confirmation/[id]` with correct totals, then confirm the same order appears on `/admin/orders`.
- Submit a checkout with a required field left blank and confirm the inline validation error appears without losing already-entered data.
- Confirm the homepage/nav "Order ahead" and "Shop the blend" links land on `/menu`, not `mailto:`.
