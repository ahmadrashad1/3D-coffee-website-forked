# Online-Ordering Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working cart → checkout → Postgres-backed order flow to the EMBER site, provable end-to-end for a client demo (frontend and backend both visibly working), plus an unauthenticated admin page listing persisted orders.

**Architecture:** Next.js switches from static export to `output: "standalone"` (a real Node server, required for API routes). One API route (`POST /api/orders`) is the entire backend surface; order lookup and the admin list are Server Components querying Prisma directly. Cart state is client-only (React Context + localStorage) until checkout submits. Postgres runs as a Docker Compose sibling service.

**Tech Stack:** Next.js (App Router) server mode, Prisma ORM, Postgres 16, Docker Compose. No new CSS framework — cart/checkout/admin UI extends the existing hand-written `app/globals.css`.

## Global Constraints

- `next.config.ts` uses `output: "standalone"`, not `output: "export"` — this project no longer produces a static `out/` build. (Spec: "Architecture")
- `POST /api/orders` must always recompute each line's price and the order total from `lib/menu-data.ts` — never trust client-submitted prices. (Spec: "Backend")
- No payment processing, no authentication anywhere including `/admin/orders`, no email/SMS confirmations, no inventory or order-status lifecycle. (Spec: "Explicitly out of scope")
- Menu items stay in a static TypeScript file, not database-backed. (Spec: "Explicitly out of scope")
- Any link that crosses between `/` and another route must be a plain `<a>` tag, never `next/link` — this codebase already fixed a canvas-engine soft-navigation bug (commit `0dbf65b`, "Fix soft-nav regression breaking canvas engine reinit between / and /menu") by using hard navigation for exactly this case, and every new cross-route link in this plan follows the same convention. Same-page hash anchors may keep using `next/link` (home variant) or plain `<a>` (menu variant), matching the existing per-page pattern in `components/Nav.tsx`.

---

### Task 1: Switch Next.js to server mode and rewrite the Docker deployment

**Files:**
- Modify: `next.config.ts`
- Modify: `Dockerfile`
- Delete: `nginx.conf`
- Modify: `.dockerignore`

**Interfaces:**
- Consumes: nothing from other tasks (this is the foundation everything else builds on).
- Produces: a Next.js server-mode build (`.next/standalone/server.js`) served directly by Node inside Docker, with the exact same visible site (homepage scroll film + menu page) as before — no feature changes yet, this task only proves the runtime switch works.

- [ ] **Step 1: Change next.config.ts to standalone output**

Edit `next.config.ts` so it reads exactly:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allows `npm run dev` to be reached from other devices on the LAN
  // (e.g. testing on a phone via the printed Network URL) without Next.js
  // blocking cross-origin dev-only requests (HMR websocket, etc.).
  allowedDevOrigins: ["172.24.32.1"],
};

export default nextConfig;
```

(Only `output` changes, from `"export"` to `"standalone"`.)

- [ ] **Step 2: Verify a local standalone build produces a server.js**

Run: `npm run build`
Expected: exits 0, and `.next/standalone/server.js` exists (check with `ls .next/standalone/server.js`).

- [ ] **Step 3: Rewrite the Dockerfile to run the Next.js server instead of nginx**

Replace the full contents of `Dockerfile` with:

```dockerfile
# Build stage: compile the Next.js server
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime stage: run the Next.js standalone server directly
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Delete nginx.conf**

Run: `git rm nginx.conf`
Expected: staged for deletion. (Recoverable from git history — nothing serves through it once the runner stage runs Node directly.)

- [ ] **Step 5: Update .dockerignore for the new build**

Read the current `.dockerignore` first. It currently excludes `docs`, `.claude`, `project-memory.md`, and `README.md` from the build context — none of that changes. Add one line so `.env` (which will exist once Task 2 introduces it) never gets baked into an image layer via `COPY . .`:

```
.env
```

- [ ] **Step 6: Build and smoke-test the image**

Run:
```bash
docker build -t ember-site .
docker run --rm -d -p 3000:3000 --name ember-site-test ember-site
sleep 2
curl -s http://localhost:3000/ | grep -o '<title>[^<]*</title>'
curl -s http://localhost:3000/menu | grep -o '<title>[^<]*</title>'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/main.js
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/frames/frames.json
docker stop ember-site-test
```
Expected:
- `<title>EMBER — Carry the ritual</title>`
- `<title>Menu — EMBER Coffee</title>`
- `200` for `/main.js`
- `200` for `/frames/frames.json`

- [ ] **Step 7: Commit**

```bash
git add next.config.ts Dockerfile .dockerignore
git commit -m "Switch Next.js to standalone server mode, run via Node instead of nginx"
```

---

### Task 2: Add Prisma + Postgres via Docker Compose

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/` (generated by Prisma CLI)
- Create: `lib/prisma.ts`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.env` (gitignored — not committed)
- Modify: `package.json`
- Modify: `Dockerfile`

**Interfaces:**
- Consumes: the Task 1 Dockerfile (extended here, not replaced).
- Produces: `prisma.order` / `prisma.orderItem` models available via `import { prisma } from "@/lib/prisma"`, used by Tasks 4, 6, and 7. A running `db` Postgres service reachable at `localhost:5432` locally and `db:5432` inside Compose.

- [ ] **Step 1: Install Prisma**

Run:
```bash
npm install @prisma/client
npm install -D prisma
```
Expected: `package.json` now lists `@prisma/client` under `dependencies` and `prisma` under `devDependencies`.

- [ ] **Step 2: Update package.json scripts**

Edit `package.json`'s `"scripts"` block to add a `postinstall` hook that regenerates the Prisma client whenever dependencies install, add a `start` script (Next's standard production-server command), and drop the now-unused `serve` script (it ran `npx serve out`, and `out/` no longer exists per Task 1):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "postinstall": "prisma generate"
}
```

- [ ] **Step 3: Create the Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

- [ ] **Step 4: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ember
      POSTGRES_USER: ember
      POSTGRES_PASSWORD: ember
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://ember:ember@db:5432/ember
    ports:
      - "3000:3000"

volumes:
  pgdata:
```

- [ ] **Step 5: Create .env.example and a local .env**

Create `.env.example`:

```
DATABASE_URL=postgresql://ember:ember@localhost:5432/ember
```

Create `.env` (already covered by the existing `.gitignore` entry `.env` — verify with `git check-ignore .env`, expected output: `.env`) with the same content, but pointing at `localhost` since this file is for running `next dev` on the host against the Dockerized `db`:

```
DATABASE_URL=postgresql://ember:ember@localhost:5432/ember
```

- [ ] **Step 6: Start Postgres and confirm it's healthy**

Run:
```bash
docker compose up -d db
sleep 3
docker compose ps
```
Expected: the `db` service shows as `running` (or `healthy`).

- [ ] **Step 7: Run the initial migration**

Run: `npx prisma migrate dev --name init`
Expected: exits 0, prints that the migration was applied, and creates `prisma/migrations/<timestamp>_init/migration.sql`.

- [ ] **Step 8: Verify the tables exist**

Run: `docker compose exec db psql -U ember -d ember -c '\dt'`
Expected: output lists both `Order` and `OrderItem` tables.

- [ ] **Step 9: Create the Prisma client singleton**

Create `lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 10: Extend the Dockerfile to generate the client, run migrations, and ship the engine binaries**

Replace the full contents of `Dockerfile` with:

```dockerfile
# Build stage: compile the Next.js server
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
RUN npm run build

# Runtime stage: run the Next.js standalone server directly
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
```

(`deps` now copies `prisma/` before `npm ci` so the `postinstall` hook from Step 2 can find the schema and generate the client. `runner` copies the generated client, the `prisma` CLI, and the schema/migrations on top of the standalone bundle so `prisma migrate deploy` can run at container start without network access.)

- [ ] **Step 11: Full-stack rebuild and verification**

Run:
```bash
docker compose down -v
docker compose up --build -d
sleep 5
curl -s http://localhost:3000/ | grep -o '<title>[^<]*</title>'
curl -s http://localhost:3000/menu | grep -o '<title>[^<]*</title>'
docker compose exec db psql -U ember -d ember -c '\dt'
```
Expected: same titles as Task 1 Step 6, and `\dt` again lists `Order` and `OrderItem` (proving `prisma migrate deploy` ran successfully against the fresh volume on container startup).

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json prisma docker-compose.yml .env.example lib/prisma.ts Dockerfile
git commit -m "Add Prisma + Postgres via Docker Compose"
```

---

### Task 3: Shared menu data and a data-driven menu page

**Files:**
- Create: `lib/menu-data.ts`
- Modify: `app/menu/page.tsx` (full rewrite of the body content, `app/menu/page.tsx:41-179`)

**Interfaces:**
- Produces: `menuItems: MenuItem[]`, `menuCategories: readonly string[]`, `formatPrice(cents: number): string`, `findMenuItem(id: string): MenuItem | undefined` — all imported from `@/lib/menu-data` by Task 4 (API pricing), Task 5 (cart + add-to-cart), and Task 6 (checkout/confirmation display).
- `MenuItem` shape: `{ id: string; category: string; name: string; description: string; priceCents: number }`.

- [ ] **Step 1: Create lib/menu-data.ts**

Create `lib/menu-data.ts`, transcribing the same 13 items/4 categories/prices currently hardcoded in `app/menu/page.tsx`:

```ts
export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  priceCents: number;
};

export const menuCategories = ["Espresso", "Filter", "Cold Brew", "Pastries"] as const;

export const menuItems: MenuItem[] = [
  { id: "espresso", category: "Espresso", name: "Espresso", description: "Single or double shot, pulled to order.", priceCents: 350 },
  { id: "cortado", category: "Espresso", name: "Cortado", description: "Espresso softened with warm milk, equal parts.", priceCents: 450 },
  { id: "cappuccino", category: "Espresso", name: "Cappuccino", description: "Espresso, steamed milk, a proper cap of foam.", priceCents: 500 },
  { id: "flat-white", category: "Espresso", name: "Flat White", description: "Double ristretto, microfoam, no nonsense.", priceCents: 525 },
  { id: "pour-over", category: "Filter", name: "Pour Over", description: "Today's single-estate lot, brewed to order.", priceCents: 550 },
  { id: "batch-brew", category: "Filter", name: "Batch Brew", description: "Our house blend, always fresh, always on.", priceCents: 375 },
  { id: "drip", category: "Filter", name: "Drip", description: "Classic filter coffee, brewed by the pot.", priceCents: 325 },
  { id: "cold-brew", category: "Cold Brew", name: "Cold Brew", description: "Steeped 18 hours, served over ice.", priceCents: 500 },
  { id: "iced-latte", category: "Cold Brew", name: "Iced Latte", description: "Espresso, cold milk, plenty of ice.", priceCents: 550 },
  { id: "sparkling-cold-brew", category: "Cold Brew", name: "Sparkling Cold Brew", description: "Cold brew, soda, a citrus twist.", priceCents: 600 },
  { id: "butter-croissant", category: "Pastries", name: "Butter Croissant", description: "Baked fresh each morning.", priceCents: 375 },
  { id: "almond-financier", category: "Pastries", name: "Almond Financier", description: "Toasted almond, brown butter.", priceCents: 400 },
  { id: "banana-bread", category: "Pastries", name: "Banana Bread", description: "Studded with toasted walnuts.", priceCents: 425 },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function findMenuItem(id: string): MenuItem | undefined {
  return menuItems.find((item) => item.id === id);
}
```

- [ ] **Step 2: Refactor the menu page to render from menu-data**

Replace `app/menu/page.tsx:41-179` (everything between the intro `blend-head` block and the closing `</section>`) so the four `menu-category` blocks are generated by mapping over `menuCategories`/`menuItems` instead of being hand-written. The full new file:

```tsx
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";
import { menuCategories, menuItems, formatPrice } from "@/lib/menu-data";

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

          {menuCategories.map((category) => (
            <div className="menu-category" data-reveal key={category}>
              <h2 className="menu-category-title">{category}</h2>
              <div className="menu-list">
                {menuItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div className="menu-row" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span className="menu-desc">{item.description}</span>
                      </div>
                      <span className="menu-price">{formatPrice(item.priceCents)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
```

- [ ] **Step 3: Verify the rendered page is unchanged**

Run:
```bash
npm run dev &
sleep 2
curl -s http://localhost:3000/menu | grep -c 'class="menu-row"'
curl -s http://localhost:3000/menu | grep -o 'Flat White'
curl -s http://localhost:3000/menu | grep -o '\$5\.25'
curl -s http://localhost:3000/menu | grep -o 'Banana Bread'
kill %1
```
Expected: `13` rows, and `Flat White`, `$5.25`, and `Banana Bread` all found — confirming the data-driven render matches the original hand-written markup.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/menu-data.ts app/menu/page.tsx
git commit -m "Extract menu items into lib/menu-data.ts, render menu page from it"
```

---

### Task 4: Orders API route

**Files:**
- Create: `app/api/orders/route.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma` (Task 2), `findMenuItem` from `@/lib/menu-data` (Task 3).
- Produces: `POST /api/orders`, accepting `{ customerName: string, contact: string, pickupTime: string, items: { menuItemId: string, quantity: number }[] }` and returning `201` with `{ id: number, totalCents: number }` on success, or `400` with `{ error: string }` on validation failure. Consumed by Task 6's checkout page.

- [ ] **Step 1: Confirm the route doesn't exist yet**

Run:
```bash
npm run dev &
sleep 2
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d '{}'
```
Expected: `404`

- [ ] **Step 2: Create the route handler**

Create `app/api/orders/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMenuItem } from "@/lib/menu-data";

type OrderLine = { menuItemId: unknown; quantity: unknown };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { customerName, contact, pickupTime, items } = body as Record<string, unknown>;

  if (
    typeof customerName !== "string" ||
    !customerName.trim() ||
    typeof contact !== "string" ||
    !contact.trim() ||
    typeof pickupTime !== "string" ||
    !pickupTime.trim()
  ) {
    return NextResponse.json(
      { error: "customerName, contact, and pickupTime are required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }

  const lines: { menuItemId: string; name: string; priceCents: number; quantity: number }[] = [];

  for (const raw of items as OrderLine[]) {
    const { menuItemId, quantity } = raw ?? {};

    if (typeof menuItemId !== "string" || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { error: `Invalid line item: ${JSON.stringify(raw)}` },
        { status: 400 }
      );
    }

    const menuItem = findMenuItem(menuItemId);
    if (!menuItem) {
      return NextResponse.json({ error: `Unknown menu item: ${menuItemId}` }, { status: 400 });
    }

    lines.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      priceCents: menuItem.priceCents,
      quantity,
    });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);

  const order = await prisma.order.create({
    data: {
      customerName: customerName.trim(),
      contact: contact.trim(),
      pickupTime: pickupTime.trim(),
      totalCents,
      items: { create: lines },
    },
  });

  return NextResponse.json({ id: order.id, totalCents: order.totalCents }, { status: 201 });
}
```

- [ ] **Step 3: Verify validation failures**

Run (dev server still up from Step 1):
```bash
curl -s -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" \
  -d '{"customerName":"","contact":"a@b.com","pickupTime":"10am","items":[{"menuItemId":"espresso","quantity":1}]}'
curl -s -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" \
  -d '{"customerName":"Jane","contact":"jane@example.com","pickupTime":"10:30am","items":[]}'
curl -s -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" \
  -d '{"customerName":"Jane","contact":"jane@example.com","pickupTime":"10:30am","items":[{"menuItemId":"not-real","quantity":1}]}'
```
Expected, respectively: `{"error":"customerName, contact, and pickupTime are required"}`, `{"error":"items must be a non-empty array"}`, `{"error":"Unknown menu item: not-real"}` — all with a `400` status (add `-w '\n%{http_code}\n'` if you want the status printed alongside).

- [ ] **Step 4: Verify a valid order persists with a server-computed total**

Run:
```bash
curl -s -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" \
  -d '{"customerName":"Jane","contact":"jane@example.com","pickupTime":"10:30am","items":[{"menuItemId":"espresso","quantity":2},{"menuItemId":"butter-croissant","quantity":1}]}'
kill %1
```
Expected: `201` with body `{"id":1,"totalCents":1075}` (2 × $3.50 = $7.00, + 1 × $3.75 = $3.75, total $10.75 = 1075 cents). The `id` may differ if you re-run this after Task 2's earlier verification inserted rows — that's fine, just confirm `totalCents` is exactly `1075`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add app/api/orders/route.ts
git commit -m "Add POST /api/orders route handler"
```

---

### Task 5: Cart state and UI

**Files:**
- Create: `components/CartContext.tsx`
- Create: `components/CartButton.tsx`
- Create: `components/CartDrawer.tsx`
- Create: `components/AddToCartButton.tsx`
- Modify: `app/layout.tsx:20-24`
- Modify: `components/Nav.tsx` (full rewrite)
- Modify: `app/menu/page.tsx` (the per-item `menu-row`, added in Task 3)
- Modify: `app/page.tsx:312-317` (the `cta-band` "Shop the blend" link)
- Modify: `app/globals.css` (append new rules)

**Interfaces:**
- Produces: `useCart()` hook (from `@/components/CartContext`) exposing `{ items: {menuItemId, quantity}[], addItem, removeItem, setQuantity, clear, totalCents, totalCount }` — consumed by Task 6's checkout page.
- Consumes: `findMenuItem`, `formatPrice` from `@/lib/menu-data` (Task 3).

- [ ] **Step 1: Create the cart context**

Create `components/CartContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { findMenuItem } from "@/lib/menu-data";

export type CartLine = { menuItemId: string; quantity: number };

type CartContextValue = {
  items: CartLine[];
  addItem: (menuItemId: string) => void;
  removeItem: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  totalCents: number;
  totalCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ember-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // ignore malformed storage
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = (menuItemId: string) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.menuItemId === menuItemId);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === menuItemId ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...prev, { menuItemId, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: string) => {
    setItems((prev) => prev.filter((line) => line.menuItemId !== menuItemId));
  };

  const setQuantity = (menuItemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(menuItemId);
      return;
    }
    setItems((prev) =>
      prev.map((line) => (line.menuItemId === menuItemId ? { ...line, quantity } : line))
    );
  };

  const clear = () => setItems([]);

  const { totalCents, totalCount } = useMemo(() => {
    return items.reduce(
      (acc, line) => {
        const menuItem = findMenuItem(line.menuItemId);
        if (!menuItem) return acc;
        return {
          totalCents: acc.totalCents + menuItem.priceCents * line.quantity,
          totalCount: acc.totalCount + line.quantity,
        };
      },
      { totalCents: 0, totalCount: 0 }
    );
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQuantity, clear, totalCents, totalCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
```

- [ ] **Step 2: Wrap the app in CartProvider**

Edit `app/layout.tsx:20-24`, changing:

```tsx
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
```

to:

```tsx
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
```

and add the import at the top with the other imports:

```tsx
import { CartProvider } from "@/components/CartContext";
```

- [ ] **Step 3: Create the add-to-cart button (client leaf inside the server-rendered menu page)**

Create `components/AddToCartButton.tsx`:

```tsx
"use client";

import { useCart } from "@/components/CartContext";

export default function AddToCartButton({ menuItemId }: { menuItemId: string }) {
  const { addItem } = useCart();
  return (
    <button type="button" className="add-to-cart" onClick={() => addItem(menuItemId)}>
      Add to cart
    </button>
  );
}
```

- [ ] **Step 4: Wire the add-to-cart button into the menu page**

In `app/menu/page.tsx`, import `AddToCartButton` and change the per-item row so price and the button are grouped together (keeps the row's two-child `space-between` layout intact instead of spreading three children unevenly):

```tsx
import AddToCartButton from "@/components/AddToCartButton";
```

```tsx
                    <div className="menu-row" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span className="menu-desc">{item.description}</span>
                      </div>
                      <div className="menu-row-actions">
                        <span className="menu-price">{formatPrice(item.priceCents)}</span>
                        <AddToCartButton menuItemId={item.id} />
                      </div>
                    </div>
```

- [ ] **Step 5: Create the cart drawer**

Create `components/CartDrawer.tsx`:

```tsx
"use client";

import { useCart } from "@/components/CartContext";
import { findMenuItem, formatPrice } from "@/lib/menu-data";

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, setQuantity, removeItem, totalCents } = useCart();

  if (!open) return null;

  return (
    <div className="cart-drawer-overlay" role="dialog" aria-label="Cart" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cart-drawer-close" onClick={onClose} aria-label="Close cart">
          ×
        </button>
        <h2>Your cart</h2>
        {items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <ul className="cart-drawer-list">
              {items.map((line) => {
                const menuItem = findMenuItem(line.menuItemId);
                if (!menuItem) return null;
                return (
                  <li key={line.menuItemId} className="cart-drawer-row">
                    <span>{menuItem.name}</span>
                    <div className="cart-drawer-qty">
                      <button type="button" onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}>
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <span>{formatPrice(menuItem.priceCents * line.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.menuItemId)}
                      aria-label={`Remove ${menuItem.name}`}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="cart-drawer-total">Total: {formatPrice(totalCents)}</div>
            <a className="cta" href="/checkout">
              Checkout
            </a>
          </>
        )}
      </div>
    </div>
  );
}
```

(`/checkout` uses a plain `<a>`, per the Global Constraints cross-route navigation rule.)

- [ ] **Step 6: Create the cart button and wire it + the repointed CTA into Nav**

Create `components/CartButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";

export default function CartButton() {
  const { totalCount } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="cart-button"
        aria-label={`Open cart, ${totalCount} item${totalCount === 1 ? "" : "s"}`}
        onClick={() => setOpen(true)}
      >
        Cart
        {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}
      </button>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

Replace the full contents of `components/Nav.tsx` — this adds `CartButton` and collapses the old two-branch "Order ahead" CTA (which pointed at `#reserve` / `${base}#reserve`) into a single plain `<a href="/menu">`, since it's now a cross-route link on every page (Global Constraints):

```tsx
import Link from "next/link";
import CartButton from "@/components/CartButton";

export default function Nav({ variant }: { variant: "home" | "menu" }) {
  const base = variant === "menu" ? "/" : "";
  return (
    <nav
      id="brandnav"
      className={variant === "menu" ? "nav-dark" : undefined}
      aria-label="Primary navigation"
    >
      {variant === "menu" ? (
        <a className="wordmark" href="/">
          <strong>EMBER</strong>
          <small>ROASTERS</small>
        </a>
      ) : (
        <Link className="wordmark" href="#top">
          <strong>EMBER</strong>
          <small>ROASTERS</small>
        </Link>
      )}
      <div className="links">
        {variant === "menu" ? (
          <a href={`${base}#story`}>Our coffee</a>
        ) : (
          <Link href="#story">Our coffee</Link>
        )}
        {variant === "menu" ? (
          <a href={`${base}#craft`}>The roast</a>
        ) : (
          <Link href="#craft">The roast</Link>
        )}
        {variant === "menu" ? (
          <a href={`${base}#gallery`}>Journal</a>
        ) : (
          <Link href="#gallery">Journal</Link>
        )}
        <a href="/menu">Menu</a>
        {variant === "menu" ? (
          <a href={`${base}#about`}>About</a>
        ) : (
          <Link href="#about">About</Link>
        )}
        <a href="mailto:hello@ember.coffee">Contact</a>
      </div>
      <div className="nav-actions">
        <CartButton />
        <a className="navcta" href="/menu">
          Order ahead
        </a>
      </div>
    </nav>
  );
}
```

- [ ] **Step 7: Repoint the homepage "Shop the blend" CTA**

Edit `app/page.tsx:312-317`, changing:

```tsx
              <a
                className="cta"
                href="mailto:hello@ember.coffee?subject=EMBER%20coffee"
              >
                Shop the blend
              </a>
```

to:

```tsx
              <a className="cta" href="/menu">
                Shop the blend
              </a>
```

- [ ] **Step 8: Append cart/nav-actions CSS**

Append to the end of `app/globals.css` (after the existing `@media(prefers-reduced-motion:reduce)` line):

```css
.nav-actions{justify-self:end;display:flex;align-items:center;gap:22px}
.cart-button{position:relative;display:inline-flex;align-items:center;gap:8px;padding:6px 0;background:none;border:0;color:inherit;font:inherit;font-size:9px;letter-spacing:.25em;text-transform:uppercase;cursor:pointer}
.cart-badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:50%;background:var(--copper);color:var(--cream);font-size:9px;letter-spacing:0}
.menu-row-actions{display:flex;align-items:center;gap:16px;flex:none}
.add-to-cart{padding:8px 14px;border:1px solid var(--line);background:none;color:inherit;font:inherit;font-size:9px;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;white-space:nowrap;transition:background .2s,color .2s}
.add-to-cart:hover,.add-to-cart:focus-visible{background:var(--ink);color:var(--cream);border-color:var(--ink)}
.cart-drawer-overlay{position:fixed;inset:0;z-index:150;background:rgba(23,20,17,.5);display:flex;justify-content:flex-end}
.cart-drawer{position:relative;width:min(420px,100%);height:100%;overflow-y:auto;padding:32px var(--gutter);background:var(--cream);color:var(--ink)}
.cart-drawer-close{position:absolute;top:24px;right:24px;background:none;border:0;font-size:24px;line-height:1;cursor:pointer;color:inherit}
.cart-drawer h2{margin:0 0 28px;font-family:var(--serif);font-size:28px;font-weight:400}
.cart-drawer-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.cart-drawer-row{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid var(--line);font-size:13px}
.cart-drawer-qty{display:flex;align-items:center;gap:8px}
.cart-drawer-qty button{width:22px;height:22px;border:1px solid var(--line);background:none;cursor:pointer;font-size:13px;line-height:1}
.cart-drawer-total{display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--ink);font-size:13px;font-weight:500}
.checkout-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:48px;align-items:start}
.checkout-form{display:flex;flex-direction:column;gap:20px}
.checkout-form label{display:flex;flex-direction:column;gap:8px;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
.checkout-form input{padding:12px 14px;border:1px solid var(--line);background:var(--paper);font:inherit;font-size:14px;color:var(--ink)}
.checkout-form button{align-self:flex-start;cursor:pointer}
.checkout-form button:disabled{opacity:.5;cursor:not-allowed}
.checkout-error{margin:0;padding:12px 14px;background:rgba(169,109,64,.12);color:var(--copper);font-size:13px}
.checkout-summary-row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--line);font-size:13px}
.admin-orders{padding:60px var(--gutter);max-width:var(--max);margin:auto}
.admin-orders-table{width:100%;border-collapse:collapse;margin-top:32px;font-size:13px}
.admin-orders-table th,.admin-orders-table td{padding:12px 16px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.admin-orders-table th{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
@media(max-width:850px){.checkout-grid{grid-template-columns:1fr}.menu-row-actions{margin-top:6px}}
```

- [ ] **Step 9: Browser-verify the cart flow**

Start the dev server (`npm run dev`) and use the Playwright MCP tools to:
1. Navigate to `http://localhost:3000/menu`.
2. Click "Add to cart" on the Espresso row, then on the Cortado row.
3. Click the "Cart" button in the nav — confirm the drawer opens showing both items and a badge reading `2`.
4. Increase Cortado's quantity to 2 using the `+` button — confirm the line total and the drawer total both update.
5. Click "Remove" on Espresso — confirm it disappears and the total drops accordingly.

Expected: all of the above behave as described, with no console errors (check via `mcp__playwright__browser_console_messages`).

- [ ] **Step 10: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 11: Commit**

```bash
git add components/CartContext.tsx components/CartButton.tsx components/CartDrawer.tsx components/AddToCartButton.tsx app/layout.tsx components/Nav.tsx app/menu/page.tsx app/page.tsx app/globals.css
git commit -m "Add cart state and UI, repoint Order-ahead CTAs to /menu"
```

---

### Task 6: Checkout and order confirmation pages

**Files:**
- Create: `app/checkout/page.tsx`
- Create: `app/order-confirmation/[id]/page.tsx`

**Interfaces:**
- Consumes: `useCart()` (Task 5), `POST /api/orders` (Task 4), `prisma` (Task 2), `findMenuItem`/`formatPrice` (Task 3).
- Produces: the `/checkout` and `/order-confirmation/[id]` routes — the end of the user-facing ordering flow.

- [ ] **Step 1: Create the checkout page**

Create `app/checkout/page.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";
import { useCart } from "@/components/CartContext";
import { findMenuItem, formatPrice } from "@/lib/menu-data";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalCents, clear } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !contact.trim() || !pickupTime.trim()) {
      setError("Please fill in your name, contact, and pickup time.");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          contact,
          pickupTime,
          items: items.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Something went wrong, please try again." }));
        setError(body.error ?? "Something went wrong, please try again.");
        setSubmitting(false);
        return;
      }

      const { id } = await res.json();
      clear();
      router.push(`/order-confirmation/${id}`);
    } catch {
      setError("Something went wrong, please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Nav variant="menu" />
      <main id="checkout-content">
        <section className="section">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">Checkout</p>
              <h1 className="display">
                Confirm your
                <br />
                <em>order.</em>
              </h1>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="lead">
              Your cart is empty. <a href="/menu">Return to the menu</a> to add something first.
            </p>
          ) : (
            <div className="checkout-grid">
              <div>
                <ul className="cart-drawer-list">
                  {items.map((line) => {
                    const menuItem = findMenuItem(line.menuItemId);
                    if (!menuItem) return null;
                    return (
                      <li key={line.menuItemId} className="checkout-summary-row">
                        <span>
                          {menuItem.name} × {line.quantity}
                        </span>
                        <span>{formatPrice(menuItem.priceCents * line.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="cart-drawer-total">Total: {formatPrice(totalCents)}</div>
              </div>

              <form className="checkout-form" onSubmit={handleSubmit}>
                <label>
                  Name
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </label>
                <label>
                  Email or phone
                  <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} />
                </label>
                <label>
                  Pickup time
                  <input
                    type="text"
                    placeholder="e.g. 10:30am"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  />
                </label>
                {error && <p className="checkout-error">{error}</p>}
                <button type="submit" className="cta" disabled={submitting}>
                  {submitting ? "Placing order…" : "Place order"}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
```

- [ ] **Step 2: Create the order confirmation page**

Create `app/order-confirmation/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/menu-data";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    notFound();
  }

  return (
    <>
      <Nav variant="menu" />
      <main id="confirmation-content">
        <section className="section">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">Order #{order.id}</p>
              <h1 className="display">
                Thanks,
                <br />
                <em>{order.customerName}.</em>
              </h1>
            </div>
            <p className="lead">Pickup time: {order.pickupTime}</p>
          </div>

          <ul className="cart-drawer-list">
            {order.items.map((item) => (
              <li key={item.id} className="checkout-summary-row">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-drawer-total">Total: {formatPrice(order.totalCents)}</div>
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
```

- [ ] **Step 3: Browser-verify the happy path**

With the dev server running (and `db` up via `docker compose up -d db`), use the Playwright MCP tools to:
1. Navigate to `http://localhost:3000/menu`, add 2× Espresso and 1× Butter Croissant to the cart.
2. Open the cart drawer, click "Checkout" — confirm you land on `/checkout` with a summary showing both lines and a total of `$10.75`.
3. Fill in Name, Email or phone, and Pickup time, then click "Place order".
4. Confirm you land on `/order-confirmation/<some-id>` showing "Thanks, <name>.", the pickup time, both line items, and a total of `$10.75`.

- [ ] **Step 4: Browser-verify the validation error path**

Using Playwright: add an item to the cart, go to `/checkout`, leave Name blank, click "Place order". Confirm an inline error message appears (e.g. "Please fill in your name, contact, and pickup time.") and the page stays on `/checkout` with the cart still intact.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add app/checkout app/order-confirmation
git commit -m "Add checkout and order-confirmation pages"
```

---

### Task 7: Admin orders page

**Files:**
- Create: `app/admin/orders/page.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2), `formatPrice` (Task 3).
- Produces: the `/admin/orders` route — a read-only, unauthenticated list of every order, proving the backend actually persisted what Task 6's checkout flow submitted.

- [ ] **Step 1: Create the admin orders page**

Create `app/admin/orders/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/menu-data";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <main className="admin-orders">
      <section className="section">
        <p className="kicker">Demo only — not authenticated</p>
        <h1 className="display">Orders</h1>
        <table className="admin-orders-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Pickup</th>
              <th>Items</th>
              <th>Total</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.customerName}</td>
                <td>{order.contact}</td>
                <td>{order.pickupTime}</td>
                <td>{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</td>
                <td>{formatPrice(order.totalCents)}</td>
                <td>{order.createdAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
```

(Deliberately renders without `Nav`/`Footer` — this reinforces that it's an internal demo view, not part of the branded site, and sidesteps having to invent a third `Nav` variant for a page that isn't part of the public site.)

- [ ] **Step 2: Verify the order placed in Task 6 shows up**

Run:
```bash
npm run dev &
sleep 2
curl -s http://localhost:3000/admin/orders | grep -o 'Butter Croissant'
curl -s http://localhost:3000/admin/orders | grep -o '\$10\.75'
kill %1
```
Expected: both strings found — the order created during Task 6's Playwright walkthrough is present, proving the admin page reads real persisted data, not mock content. (If you skipped Task 6's manual walkthrough, place one test order via `curl` first, matching Task 4 Step 4's example payload.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add app/admin
git commit -m "Add unauthenticated admin orders page"
```

---

### Task 8: Documentation and final full-stack verification

**Files:**
- Modify: `README.md`

**Interfaces:** None — this is the final gate before calling the feature done.

- [ ] **Step 1: Update README.md**

Read the current `README.md` first. Replace the "Run locally" and "Build" sections with:

```markdown
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
```

Add a new section after "Asset pipeline":

```markdown
## Ordering demo

`/menu` has "Add to cart" on every item. The cart (top-right nav icon) leads to `/checkout`, which posts to `POST /api/orders` — Postgres stores the order via Prisma, prices are always recomputed server-side from `lib/menu-data.ts`. `/order-confirmation/[id]` shows the receipt; `/admin/orders` lists every order ever placed (no authentication — demo only, not for production use).
```

- [ ] **Step 2: Clean full-stack rebuild**

Run:
```bash
docker compose down -v
docker compose up --build -d
sleep 5
```
Expected: exits 0, both `db` and `app` containers running (`docker compose ps`).

- [ ] **Step 3: Full walkthrough against the clean container stack**

Using Playwright MCP against `http://localhost:3000`:
1. `/` loads with the scroll film working.
2. Nav "Order ahead" and the homepage "Shop the blend" CTA both land on `/menu`.
3. Add two different items to the cart from `/menu`, check out with a name/contact/pickup time, land on a correct `/order-confirmation/[id]`.
4. `/admin/orders` shows that order.

- [ ] **Step 4: Confirm git status is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` (aside from any pre-existing untracked files unrelated to this work, e.g. `.playwright-mcp/`).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "Update README for the Postgres-backed ordering demo"
```
