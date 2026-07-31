FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
RUN mkdir -p apps/lanka-mahal
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/lanka-mahal/package.json apps/lanka-mahal/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter=lanka-mahal build
WORKDIR /app/apps/lanka-mahal
EXPOSE 3000
CMD npx next start
