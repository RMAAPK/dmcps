# 🛡️ DMCPS (Docker Model Context Protocol Secured)

[![CI Tests](https://github.com/RMAAPK/dmcps/actions/workflows/test.yml/badge.svg)](https://github.com/RMAAPK/dmcps/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.thealidev/dmcps-success)](https://registry.modelcontextprotocol.io/)

**🔥 OFFICIALLY PUBLISHED ON THE GLOBAL MCP REGISTRY!** 
A true revolution in AI security. DMCPS seamlessly bypasses PaaS hypervisor limitations (like Render's `no-new-privileges`) via application-layer interceptors while retaining a military-grade directory sandbox.

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



## 🚀 DMCPS V2: Absolute Sandbox Isolation (Rewrite In Progress)

### The "Massive Rocks" We Hit (Why V2?)
Our legacy architecture on AWS/Render hit fundamental bottlenecks:
1. **Startup Lag:** Dynamic container builds (`npm ci`, disk chowning) on every request choked disk I/O and CPU, leading to massive lag on micro-instances.
2. **Lost Base Control:** The latency caused agents to randomly lose structural connection to the base orchestrator.

### The V2 Rewrite Architecture
DMCPS V2 throws out dynamic building and shifts to a **pure disposable isolation** model:
- **Instant Orchestration:** We spin up a pre-built monolithic `dmcps-base` image via `docker run` in milliseconds.
- **Root Without Risk:** The AI gets a full, unrestricted OS (no sudo blocks, no firewalls, full `rm -rf` power) completely *inside* the disposable Docker sandbox. The AI is assigned a direct `root` user, tricking it into feeling absolute freedom without any "Permission denied" frustrations, because the container is entirely disposable.
- **Dashboard Whitelisting & Auto-Backups:** The dashboard now supports explicit directory mounting toggles (**Write Access** & **Backup Enabled**). 
- **HF Bucket Automated Backups:** Backups can be seamlessly managed and synced through a dedicated HuggingFace bucket, completely offloading backup I/O and storage from the primary server.

### DMCPS vs. OpenClaw / OpenHands (and other Agent Sandboxes)
While frameworks like **OpenClaw** or **OpenHands** provide excellent generic runtime sandboxes for LLM development, **DMCPS** is explicitly engineered for *safe local production orchestration*:
1. **Absolute Root Illusion:** OpenClaw often locks down the environment or requires complex privilege escalation. DMCPS grants the agent native `root` inside a disposable container, immediately satisfying the agent's permission checks and avoiding broken script loops.
2. **Dashboard-driven Access:** Instead of blindly mounting everything, DMCPS uses a strict whitelist dashboard where you grant explicit paths (with backup enforcement).
3. **PaaS Native:** DMCPS is built from the ground up to deploy flawlessly on highly restricted PaaS environments (like Render and Railway) that block `setuid`/Docker-in-Docker, making it trivial to run a secure agent on a $5 cloud instance.

---
A highly secure, isolated Model Context Protocol (MCP) server environment designed to give AI agents access to a sandboxed filesystem and shell execution, without compromising the host machine. 

This is built as a robust **Node.js/Express backend daemon**, featuring a "military-grade" secured dashboard to strictly manage which directories the AI is allowed to touch.

## 🛡️ Key Security Features
- **PaaS Hypervisor Bypass via Node**: Runs natively as root within the container, but uses JS interceptors to filter commands, allowing package installs (`apk add`) seamlessly on Render without triggering `no-new-privileges` crashes.
- **Strict Whitelisting**: The AI cannot read, write, or execute commands outside of directories explicitly whitelisted via the web dashboard. (Directory traversal attempts like `../` are mathematically blocked).
- **Hardened Dashboard**:
  - Protected by customizable environment credentials (`ADMIN_USERNAME` and `ADMIN_PASSWORD`).
  - Implements **Rate Limiting** to prevent brute-force login attacks.
  - Hardened with **Helmet** (CSP, HSTS, XSS protection, anti-sniffing).
- **Auto-Generated API Keys**: Connect to your MCP server using a dynamically generated Bearer token to ensure only authorized agents can execute tools on your server.
- **Pre-installed AI Toolkit**: Foundational tools (`git`, `python3`, `curl`, `bash`, `make`, `jq`) are pre-baked into the image so the AI is immediately ready to work.

## 🚀 Getting Started Locally

### 1. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and set your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

### 2. Run with Docker Compose
The safest way to run this is via the provided `docker-compose.yml`:
```bash
docker-compose up -d --build
```
This will mount your local `./projects` folder into the sandbox, but the AI won't be able to touch it until you approve the path in the dashboard.

### 3. Configure the Sandbox & Get Your API Key
Navigate to the mobile-friendly dashboard:
👉 **http://localhost:3000/** 
Log in with your configured `ADMIN_USERNAME` (default: admin) and `ADMIN_PASSWORD`.

From the dashboard, you can:
1. **Whitelist directories** (e.g., `/projects/my-app`) that the AI can interact with.
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
4. When prompted for the **MCP Server URL**, enter your server's root endpoint (e.g. `https://YOUR-APP-URL.onrender.com`).
   > ⚠️ **IMPORTANT**: Do NOT use `trycloudflare.com` quick tunnels. Cloudflare's anti-bot "Checking your browser" interstitial page blocks Gemini Spark from verifying the connection. Use `localhost.run` (recommended) or a permanent domain.
5. Gemini Spark will automatically verify the server by fetching OAuth discovery metadata (`/.well-known/oauth-protected-resource`).
6. Follow the on-screen prompts. If asked to authorize, our custom dummy OAuth flow will handle the redirect automatically.
7. Click Connect!

Once connected, you can open a chat with Gemini on your phone and ask it to `list files in my project directory` or `run a shell command to start the server`. Enjoy the power of Cursor right in your pocket! 🎉
