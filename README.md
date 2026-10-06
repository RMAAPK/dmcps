# 🛡️ DMCPS (Docker Model Context Protocol Secured)

[![CI Tests](https://github.com/RMAAPK/dmcps/actions/workflows/test.yml/badge.svg)](https://github.com/RMAAPK/dmcps/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="https://render.com/deploy?repo=https://github.com/RMAAPK/dmcps">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render">
  </a>
  &nbsp;&nbsp;
  <a href="https://railway.app/template?gh_repo=RMAAPK/dmcps">
    <img src="https://railway.app/button.svg" alt="Deploy on Railway">
  </a>
  &nbsp;&nbsp;
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRMAAPK%2Fdmcps">
    <img src="https://vercel.com/button" alt="Deploy with Vercel">
  </a>
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/dmcps/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-dmcps" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1333432&theme=neutral" alt="DMCPS - Secure Docker sandbox for AI agent filesystem & shell access | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</p>

A highly secure, isolated Model Context Protocol (MCP) server environment designed to give AI agents access to a sandboxed filesystem and shell execution, without compromising the host machine. 

This is built as a robust **Node.js/Express backend daemon**, featuring a "military-grade" secured dashboard to strictly manage which directories the AI is allowed to touch.

## 🛡️ Key Security Features
- **Zero Root Access**: Runs as a non-root user (`node`) inside an Alpine Docker container.
- **Strict Whitelisting**: The AI cannot read, write, or execute commands outside of directories explicitly whitelisted via the web dashboard. (Directory traversal attempts like `../` are mathematically blocked).
- **Hardened Dashboard**:
  - Protected by a single environment password (`ADMIN_PASSWORD`).
  - Implements **Rate Limiting** to prevent brute-force login attacks.
  - Hardened with **Helmet** (CSP, HSTS, XSS protection, anti-sniffing).
- **Auto-Generated API Keys**: Connect to your MCP server using a dynamically generated Bearer token to ensure only authorized agents can execute tools on your server.
- **Application-Layer Sudo Whitelist**: `sudo` is unlocked to allow the AI to install packages, but execution is strictly validated against a dashboard whitelist before reaching the shell. (`apk add` is whitelisted by default).
- **Firewall (iptables) Whitelist**: Manage specific outbound network destinations dynamically from the dashboard.
- **Pre-installed AI Toolkit**: Foundational tools (`git`, `python3`, `curl`, `bash`, `make`, `jq`) are pre-baked into the image so the AI is immediately ready to work.

## 🚀 Getting Started Locally

### 1. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and set your `ADMIN_PASSWORD`. (Optional: Add an `NGROK_AUTHTOKEN` to expose the server to the internet).

### 2. Run with Docker Compose
The safest way to run this is via the provided `docker-compose.yml`:
```bash
docker-compose up -d --build
```
This will mount your local `./projects` folder into the sandbox, but the AI won't be able to touch it until you approve the path in the dashboard.

### 3. Configure the Sandbox & Get Your API Key
Navigate to the mobile-friendly dashboard:
👉 **http://localhost:3000/** 
Log in with username `admin` and your `ADMIN_PASSWORD`. 

From the dashboard, you can:
1. **Whitelist directories** (e.g., `/projects/my-app`) that the AI can interact with.
2. **Whitelist root commands** for controlled package management (Note: `apk add` is already allowed by default).
3. **Configure Firewall** by opening specific outgoing destinations via `iptables`.
4. **Copy your API Key** needed for the AI agent to securely connect.
5. **Monitor Active Connections** in real-time.
6. **Copy the exact JSON Config** for Cursor or Claude Desktop.

### 4. Connect your AI Agent
Point your MCP-compatible AI agent (like Cursor, Claude Desktop, Gemini, Spark, or custom tools) to the Server-Sent Events (SSE) endpoint securely. 

Raw agents and clients can connect to standard endpoints:
👉 **http://localhost:3000/sse** OR **http://localhost:3000/mcp**

You must pass the auto-generated API Key (found in your dashboard) in the request headers:
```
Authorization: Bearer mcp_your_random_key_here
```
*(You can also pass it in the URL for raw browser connections: `/mcp?key=mcp_your_random_key_here`)*

---

## 🌍 Cloud Deployments (Backend)
This is a persistent backend service, not a static frontend. It is pre-configured for 1-click deployments on modern PaaS providers.

### Render
Clicking deploy or pushing to Render will automatically read `render.yaml`. It spins up a persistent Node.js web service and auto-generates an `ADMIN_PASSWORD` for you.

### Railway
Push to Railway and it will automatically detect the `railway.toml` config, building the backend via Nixpacks and keeping the daemon alive automatically.

### Vercel (Testing Only)
Vercel is supported via `vercel.json` for UI testing. *Note: Because Vercel is a stateless serverless platform, whitelist configurations and API keys will be saved to `/tmp` and will reset when the function goes to sleep. For production, use Render, Railway, or Docker.*

---

## 🧪 Running Automated Tests
The security rules (Path checking, Directory Traversal prevention, Suffix attacks) are proven via an automated Jest test suite.
To run the tests without starting the server:
```bash
npm install
npm test
```

## 🛠️ MCP Tools Exposed to the AI
Once authenticated and restricted to a whitelisted folder, the AI has access to:
1. `read_file` - Read text from a file.
2. `write_file` - Write content to a file.
3. `list_directory` - List all files in a folder.
4. `run_shell_command` - Execute terminal commands strictly within the isolated workspace.

## 🚀 The Revolution: "Cursor on your Phone" (Gemini Mobile)
This server features a custom **Streamable HTTP Transport Adapter** designed specifically to bypass Google's aggressive caching and seamlessly hook into the Gemini mobile app (and web app). 

You can now turn your phone into a full-fledged cloud coding environment, giving Gemini arbitrary filesystem and shell execution access on your machine!

### How to Connect to Gemini
1. Open the Gemini App (or gemini.google.com).
2. Go to **Settings > Connected Apps**.
3. Scroll to the bottom and click **Add a custom app** under "Custom apps for Spark".
4. When prompted for the **MCP Server URL**, enter your server's endpoint:
   👉 `https://YOUR-APP-URL.onrender.com/gemini`
5. (If prompted for a Client ID or Secret, just leave them blank or enter dummy text — our custom OAuth bypass handles it automatically).
6. Click Connect!

Once connected, you can open a chat with Gemini on your phone and ask it to `list files in my project directory` or `run a shell command to start the server`. Enjoy the power of Cursor right in your pocket! 🎉
