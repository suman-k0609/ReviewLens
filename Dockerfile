# Multi-stage build for ReviewLens
# Stage 1: Build client frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./server/
COPY reviews.csv ./
COPY jest.config.js ./

# Copy built frontend to client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Ensure data directory for cache exists
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server/index.js"]
