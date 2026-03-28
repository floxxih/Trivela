FROM node:20-alpine AS base

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/server.js"]
