FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS api
COPY apps/api/ apps/api/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
EXPOSE 3001
CMD ["pnpm", "--filter=api", "start"]

FROM base AS admin
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY apps/admin/ apps/admin/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=admin build
WORKDIR /app/apps/admin
EXPOSE 3000
CMD npx next start
