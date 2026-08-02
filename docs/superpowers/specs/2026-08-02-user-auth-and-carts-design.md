# Add user accounts (sign up / login) with per-user carts

## Goal

Gate the ordering flow behind a real account: anyone can browse `/menu`, but adding an item to a cart requires being signed in. Carts become account-owned data in Postgres rather than a browser convenience, and placed orders record which account placed them. Sign up / log in must be implemented correctly (real password hashing, real session verification) even though the scope is deliberately minimal — no email verification, password reset, or OAuth yet; those come later.

## Context

The site currently has a fully working, unauthenticated ordering flow (see [2026-08-02-online-ordering-backend-design.md](2026-08-02-online-ordering-backend-design.md)): `CartContext` (`components/CartContext.tsx`) holds cart state client-side, seeded from and persisted to `localStorage`, with no concept of a user. `POST /api/orders` (`app/api/orders/route.ts`) accepts any request and creates an anonymous `Order`. There is no `User` model, no auth of any kind, and no session mechanism. Prisma + Postgres are already in place (`prisma/schema.prisma`, `lib/prisma.ts`), and `app/layout.tsx` already wraps the app in a client provider (`CartProvider`) — this design extends that same shape rather than introducing a new one.

## Data model

Add to `prisma/schema.prisma`:

```prisma
model User {
  id           Int        @id @default(autoincrement())
  email        String     @unique
  passwordHash String
  createdAt    DateTime   @default(now())
  cartItems    CartItem[]
  orders       Order[]
}

model CartItem {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id])
  menuItemId String
  quantity   Int
  createdAt  DateTime @default(now())

  @@unique([userId, menuItemId])
}
```

No separate `Cart` header entity — there's nothing cart-level to store beyond its line items (YAGNI), so `CartItem` links straight to `User`. The `@@unique([userId, menuItemId])` constraint means "add to cart" is an upsert (increment quantity if the row exists, insert at quantity 1 if not), mirroring the shape `CartContext.addItem` already has today.

`Order` gains a required relation:

```prisma
model Order {
  id           Int         @id @default(autoincrement())
  userId       Int
  user         User        @relation(fields: [userId], references: [id])
  customerName String
  contact      String
  pickupTime   String
  totalCents   Int
  createdAt    DateTime    @default(now())
  items        OrderItem[]
}
```

`customerName`/`contact`/`pickupTime` stay exactly as they are — they're not replaced by account data, just joined by `userId`. Since only a signed-in user can ever have cart items to check out with, `userId` is required, not optional.

## Auth mechanics

- **Password hashing:** `bcryptjs` (pure JS — avoids the native-module build friction already sidestepped once this project for the same reason). Min password length 8 characters, no other complexity rules.
- **Session token:** a JWT signed with `jose`, containing `{ userId }`, stored in an httpOnly cookie (`sameSite: "lax"`, `secure` in production, ~7 day expiry). New `JWT_SECRET` env var, added to `.env.example` and the `app` service's environment in `docker-compose.yml`, generated fresh (not reused from anywhere).
- **Routes:**
  - `POST /api/auth/signup` — body `{ email, password }`. Validates email shape and password length, checks `User.email` uniqueness (returns 409 on conflict), hashes the password, creates the `User`, signs and sets the session cookie, returns `{ id, email }`.
  - `POST /api/auth/login` — body `{ email, password }`. Looks up by email, `bcrypt.compare`s the password, sets the session cookie on success, `401` on any failure (wrong email or wrong password get the same generic error, to avoid leaking which one was wrong).
  - `POST /api/auth/logout` — clears the cookie.
- No password-reset, no email verification, no OAuth, no "remember me" beyond the cookie's own expiry, no rate-limiting on login attempts — all explicitly deferred.

## Server-driven state (no hydration flash)

`app/layout.tsx` (`RootLayout`) already runs as a Server Component. It will read the session cookie via `next/headers`, verify the JWT, and — if valid — load the `User` and their `CartItem` rows from Postgres in that same server render. Both get passed down as initial props into two providers wrapping `{children}`: a new `AuthProvider` and the existing `CartProvider` (now reworked, see below).

This means the very first HTML byte already reflects real auth/cart state for that request — there is no client-side fetch-after-mount and nothing resembling the `/checkout` "Your cart is empty" flash this project already hit and fixed once for the old `localStorage`-seeded cart (see the prior design doc's fix history). `AuthProvider` holds no state of its own; it's a pass-through context around the server-provided `user` value. Auth state only changes on login/signup/logout, and each of those triggers a `router.refresh()` (re-running `RootLayout`, which flows fresh `user`/cart values straight through) followed by closing the auth UI.

`CartContext` keeps local React state for responsive add/remove/quantity interactions (unchanged UX from before), but that state is now seeded from the server-provided cart instead of `localStorage`, and `localStorage` is dropped from `CartContext` entirely. Each mutation (`addItem`/`removeItem`/`setQuantity`) calls a `/api/cart` route and updates local state from that route's response.

## Cart API routes

All three require a valid session (`401` without one — this is where "logged-out users can't add to cart" is actually enforced, not just hidden in the UI):

- `POST /api/cart/items` — body `{ menuItemId }`. Upserts the `CartItem` (increment if it exists, insert at quantity 1 if not — same semantics as today's client-side `addItem`). Returns the updated cart.
- `PATCH /api/cart/items/[menuItemId]` — body `{ quantity }`. Sets the line's quantity; `quantity < 1` deletes the row (same semantics as today's `setQuantity`). Returns the updated cart.
- `DELETE /api/cart/items/[menuItemId]` — removes the line. Returns the updated cart.

Each recomputes and returns `{ items, totalCents, totalCount }` (the same shape `CartContext` already exposes today) so the client can just replace its local state with the response — no separate refetch step needed.

## UI

- **`AuthModal`** (new component, structurally similar to `CartDrawer` — slide-in overlay): two modes, login and signup, toggleable within the same modal. On success: closes itself and calls `router.refresh()`.
- **`Nav`**: logged-out shows a "Log in" trigger that opens `AuthModal`. Logged-in shows the account (email) and a "Log out" action (posts to `/api/auth/logout`, then `router.refresh()`). The cart icon/badge is unchanged in appearance, now just reflecting the server-backed cart.
- **`AddToCartButton`**: reads `useAuth()`. Signed in → behaves exactly as today. Signed out → the button renders identically, but clicking it opens `AuthModal` directly (via `openLogin()`) instead of calling the cart API — the user stays on `/menu`, the modal is an overlay, not a navigation. (Revised from an earlier two-step "inline prompt, then click a separate link" design — direct-open is simpler and matches "asks the user to log in first.")
- **`/checkout`**: form fields (name/contact/pickup time) are unchanged. `POST /api/orders` now additionally requires a session (`401` without one) and stamps `userId` from the session onto the created `Order` — never from anything client-submitted, the same principle already applied to prices.

## Explicitly out of scope

- Email verification, password reset, OAuth/social login.
- Account settings / profile editing.
- Admin authentication (`/admin/orders` stays exactly as unauthenticated as it already is — out of scope for this change, unrelated concern).
- Rate-limiting or lockout on login attempts.
- Merging/transferring a cart between accounts, or any "guest cart" concept — there is no guest cart, by design, since logged-out users can never add anything.
- A "my orders" history page (the data now supports one via `Order.userId`, but no page is being built here).

## Verification plan

- `npm run build` succeeds; `/checkout`, `/menu` etc. keep their existing static/dynamic split correctly (any new pages/routes reading the session must not become accidentally statically prerendered — the exact bug class this project already hit once in the Docker build for `/admin/orders`).
- `docker compose up --build` succeeds from a clean volume (migration for the new tables applies automatically, as established).
- Browser walkthrough: sign up a new account, confirm immediate login (cookie set, `RootLayout` reflects the account). Log out, confirm `/menu`'s "Add to cart" shows the inline log-in prompt instead of adding. Log back in, add items, confirm the cart persists across a hard page reload (proving it's server-backed, not `localStorage`) and across logging out and back in as the same user. Complete checkout, confirm the resulting order is associated with that account (visible via `/admin/orders` showing the linked user, e.g. by email). Attempt signup with a duplicate email — confirm a clear error, no account created. Attempt login with a wrong password — confirm a generic auth error, no information leak about which field was wrong.
- Confirm `POST /api/cart/items` and `POST /api/orders` both return `401` when called with no session cookie (e.g. via `curl`), proving the gating is enforced server-side, not just hidden in the UI.
