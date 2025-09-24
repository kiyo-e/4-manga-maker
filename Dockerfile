# Development container that runs the Vite dev server with Bun.
FROM oven/bun:1.1.34

WORKDIR /app

# Install dependencies before copying the full source to leverage Docker layer caching.
COPY package.json bun.lock ./
RUN bun install --no-save

# Bring in the rest of the project files.
COPY . .

# Make sure Vite binds to all interfaces when running inside the container.
ENV HOST=0.0.0.0
EXPOSE 5173

CMD ["bun", "run", "dev"]
