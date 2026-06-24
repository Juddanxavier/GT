FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY . .
RUN rm -rf apps/admin node_modules .git .next .turbo .dockerignore .env* *.md
RUN pnpm install --frozen-lockfile
EXPOSE 3001
CMD ["pnpm", "--filter=api", "start"]
