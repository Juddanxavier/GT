FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
RUN mkdir -p apps/customer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/customer/package.json apps/customer/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter=customer build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app/apps/customer
RUN mkdir -p .next
COPY --from=builder /app/apps/customer/.next ./.next
COPY --from=builder /app/apps/customer/public ./public
COPY --from=builder /app/apps/customer/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/customer/next.config.ts ./
EXPOSE 3002
CMD npx next start -p 3002
