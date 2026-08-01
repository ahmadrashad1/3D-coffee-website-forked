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
# `prisma migrate deploy` loads @prisma/config, which pulls in this exact
# closure of hoisted runtime deps (verified by recursively resolving
# @prisma/config's dependency tree via each package's own package.json, then
# proven against a real cold build). Copied explicitly, package by package,
# instead of the full deps node_modules, so devDependencies (typescript,
# @types/*, vitest, etc.) never make it into the runtime image.
COPY --from=deps /app/node_modules/@standard-schema ./node_modules/@standard-schema
COPY --from=deps /app/node_modules/c12 ./node_modules/c12
COPY --from=deps /app/node_modules/chokidar ./node_modules/chokidar
COPY --from=deps /app/node_modules/citty ./node_modules/citty
COPY --from=deps /app/node_modules/confbox ./node_modules/confbox
COPY --from=deps /app/node_modules/consola ./node_modules/consola
COPY --from=deps /app/node_modules/deepmerge-ts ./node_modules/deepmerge-ts
COPY --from=deps /app/node_modules/defu ./node_modules/defu
COPY --from=deps /app/node_modules/destr ./node_modules/destr
COPY --from=deps /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=deps /app/node_modules/effect ./node_modules/effect
COPY --from=deps /app/node_modules/empathic ./node_modules/empathic
COPY --from=deps /app/node_modules/exsolve ./node_modules/exsolve
COPY --from=deps /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=deps /app/node_modules/giget ./node_modules/giget
COPY --from=deps /app/node_modules/jiti ./node_modules/jiti
COPY --from=deps /app/node_modules/node-fetch-native ./node_modules/node-fetch-native
COPY --from=deps /app/node_modules/nypm ./node_modules/nypm
COPY --from=deps /app/node_modules/ohash ./node_modules/ohash
COPY --from=deps /app/node_modules/pathe ./node_modules/pathe
COPY --from=deps /app/node_modules/perfect-debounce ./node_modules/perfect-debounce
COPY --from=deps /app/node_modules/pkg-types ./node_modules/pkg-types
COPY --from=deps /app/node_modules/pure-rand ./node_modules/pure-rand
COPY --from=deps /app/node_modules/rc9 ./node_modules/rc9
COPY --from=deps /app/node_modules/readdirp ./node_modules/readdirp
COPY --from=deps /app/node_modules/tinyexec ./node_modules/tinyexec
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
