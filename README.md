# Docker SSH MCP - Sandbox

A highly secure, isolated Model Context Protocol (MCP) server environment designed to give AI agents access to a sandboxed filesystem and shell execution, without compromising the host machine. 

## 🚀 Pure IPv4 Elastic IP Architecture (Zero Tunnels)

**Why we abandoned Ngrok, Cloudflare Relay, and localhost.run:**
When connecting sophisticated agents like Google Gemini, we discovered that traditional tunnel services break the delicate MCP Server-Sent Events (SSE) stream:
- **Ngrok / localhost.run:** Interstitial warning screens ("Visit Site" buttons) completely break Gemini's automated API handshake and metadata discovery.
- **Cloudflare Tunnels:** Strict HTTP/2 WebSocket limitations, aggressive timeouts, and anti-bot verification pages drop long-running agent shell execution streams.

**The Solution:**
DMCPS now runs on a **Pure Elastic IPv4 Address** backed by an automatic **Caddy Reverse Proxy**. 
This provides a direct, un-proxied (no middleman), low-latency connection with an auto-renewing Let's Encrypt SSL certificate via `sslip.io`. Gemini connects instantly, sees valid CORS headers, and never drops the stream.

### 1. Configure Environment
Create a `.env` file on your server (do not commit this):
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=supersecret
DOMAIN_NAME=16.176.42.41.sslip.io
```
*(Replace the IP with your AWS Elastic IP)*

### 2. Deploy on AWS (Docker Compose)
Run the provided stack which instantly spins up the MCP Server and the Caddy SSL reverse proxy:
```bash
docker compose up -d --build
```

### 3. Connect to Gemini (Cursor on your Phone)
1. Open the Gemini App (or gemini.google.com).
2. Go to **Settings > Connected Apps**.
3. Scroll to the bottom and click **Add a custom app**.
4. Enter your endpoint URL (e.g. `https://16.176.42.41.sslip.io/sse`).
5. Authenticate and connect!

Enjoy absolute, unrestricted shell and file access right from your mobile device!
