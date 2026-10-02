# Secure Docker SSH MCP Sandbox

A highly secure, isolated Model Context Protocol (MCP) server environment designed to give AI agents access to a sandboxed filesystem and shell execution, without compromising the host machine. 

This is built as a robust **Node.js/Express backend daemon**, featuring a "military-grade" secured dashboard to strictly manage which directories the AI is allowed to touch.

## 🛡️ Key Security Features
- **Zero Root Access**: Runs as a non-root user (`node`) inside an Alpine Docker container.
- **Strict Whitelisting**: The AI cannot read, write, or execute commands outside of directories explicitly whitelisted via the web dashboard. (Directory traversal attempts like `../` are mathematically blocked).
- **Hardened Dashboard**:
  - Protected by a single environment password (`ADMIN_PASSWORD`).
  - Implements **Rate Limiting** to prevent brute-force login attacks.
  - Hardened with **Helmet** (CSP, HSTS, XSS protection, anti-sniffing).
- **Docker Lockdown**: 
  - Drops all Linux kernel capabilities (`cap_drop: ALL`).
  - Prevents privilege escalation (`security_opt: no-new-privileges:true`).
  - The root container filesystem is strictly read-only.

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

### 3. Configure the Sandbox
Navigate to the mobile-friendly dashboard:
👉 **http://localhost:3000/** 
Log in with username `admin` and your `ADMIN_PASSWORD`. Use the dashboard to whitelist a specific directory (e.g., `/projects/my-app`).

### 4. Connect your AI Agent
Point your MCP-compatible AI agent (like Cursor, Claude Desktop, or custom tools) to the Server-Sent Events (SSE) endpoint:
👉 **http://localhost:3000/sse**

---

## 🌍 Cloud Deployments (Backend)
This is a persistent backend service, not a static frontend. It is pre-configured for 1-click deployments on modern PaaS providers.

### Render
Clicking deploy or pushing to Render will automatically read `render.yaml`. It spins up a persistent Node.js web service and auto-generates an `ADMIN_PASSWORD` for you.

### Railway
Push to Railway and it will automatically detect the `railway.toml` config, building the backend via Nixpacks and keeping the daemon alive automatically.

### Vercel (Testing Only)
Vercel is supported via `vercel.json` for UI testing. *Note: Because Vercel is a stateless serverless platform, whitelist configurations will be saved to `/tmp` and will reset when the function goes to sleep. For production, use Render, Railway, or Docker.*

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
