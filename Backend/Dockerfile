# Production Dockerfile for Gemini Live Voice Agent Backend
FROM node:20-bookworm-slim

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3001

WORKDIR /app

# Copy package manifests first for optimal Docker layer caching
COPY package*.json ./

# Install production npm packages and install Chromium with all Linux OS dependencies
RUN npm ci --omit=dev && \
    npx playwright install --with-deps chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy backend source code
COPY src/ ./src/

# Expose backend port
EXPOSE 3001

# Healthcheck for container orchestrators (GCP Cloud Run, Render, Docker Compose)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run backend
CMD ["node", "src/server.js"]
