FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY vendor ./vendor
RUN npm ci

COPY src ./src
COPY templates ./templates
COPY scripts ./scripts
COPY .env.example ./

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

COPY package*.json ./
COPY vendor ./vendor
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/.env.example ./

EXPOSE 1453

ENV PORT=1453
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]
