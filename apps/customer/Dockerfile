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
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/customer/package.json apps/customer/
COPY packages/ packages/
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/apps/customer/.next apps/customer/.next
COPY --from=builder /app/apps/customer/public apps/customer/public
COPY --from=builder /app/apps/customer/next.config.ts apps/customer/
WORKDIR /app/apps/customer
EXPOSE 3002
CMD node /app/node_modules/next/dist/bin/next start --port 3002
