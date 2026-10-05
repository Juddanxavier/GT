FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

FROM base AS api
COPY apps/api/package.json apps/api/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
COPY apps/api/ apps/api/
RUN pnpm --filter=api build
EXPOSE 3001
CMD ["pnpm", "--filter=api", "start"]

FROM base AS admin
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://api.gajantraders.com}
COPY apps/admin/package.json apps/admin/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter=admin build
WORKDIR /app/apps/admin
EXPOSE 3000
CMD npx next start

FROM base AS customer
COPY apps/customer/package.json apps/customer/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter=customer build
WORKDIR /app/apps/customer
EXPOSE 3002
CMD npx next start
