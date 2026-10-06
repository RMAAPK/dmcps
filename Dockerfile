FROM node:20-alpine

# Alpine's node image already has a non-root 'node' user

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Install cloudflared for Cloudflare Tunnel support and sudo for package management
USER root
RUN apk add --no-cache curl sudo iptables && \
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared && \
    echo "node ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/node && \
    chmod 0440 /etc/sudoers.d/node

# Copy application source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Create the isolated workspace directory and assign ownership to the non-root user
RUN mkdir -p /workspace && chown -R node:node /workspace && chown -R node:node /app

# Switch to the non-root user for security
USER node

# Start the MCP server using stdio
CMD ["npm", "start"]

