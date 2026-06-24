FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/ packages/
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter=admin build
WORKDIR /app/apps/admin
EXPOSE 3000
CMD npx next start
