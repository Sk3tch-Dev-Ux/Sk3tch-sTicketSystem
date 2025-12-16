# Use Node.js LTS
FROM node:22-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Run as non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /usr/src/app
USER appuser

# Start the bot
CMD ["node", "src/index.js"]
