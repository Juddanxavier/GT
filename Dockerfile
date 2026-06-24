FROM node:22-alpine AS api
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY . .
RUN rm -rf apps/admin node_modules .git .next .turbo .dockerignore .env* *.md
RUN pnpm install --frozen-lockfile
EXPOSE 3001
CMD ["pnpm", "--filter=api", "start"]

FROM node:22-alpine AS admin
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN rm -rf apps/api node_modules .git .next .turbo .dockerignore .env* *.md
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=admin build
WORKDIR /app/apps/admin
EXPOSE 3000
CMD npx next start
