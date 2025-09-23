FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies needed for building the Vite bundle.
COPY package.json package-lock.json ./
RUN npm ci

# Copy project sources and build the production bundle.
COPY . .
RUN npm run build


FROM node:22-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

# Copy the built assets and Cloud Run entry point from the builder stage.
COPY --from=builder /app/dist ./dist
COPY server ./server

RUN chown -R node:node /app
USER node

# Cloud Run sets PORT; default to 8080 for local testing.
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/cloud-run.mjs"]
