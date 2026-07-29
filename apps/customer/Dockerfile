FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
RUN mkdir -p apps/customer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/customer/package.json apps/customer/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter=customer build
WORKDIR /app/apps/customer
EXPOSE 3000
CMD npx next start
