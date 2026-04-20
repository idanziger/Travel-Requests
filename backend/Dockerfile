FROM node:22-alpine

WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=3001

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/dist ./dist
COPY backend/database_schema.sql ./database_schema.sql

EXPOSE 3001

CMD ["node", "dist/index.js"]
