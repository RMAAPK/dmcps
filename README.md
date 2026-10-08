# 🛡️ DMCPS V3 (Google Cloud Edition)

[![CI Tests](https://github.com/RMAAPK/dmcps/actions/workflows/test.yml/badge.svg)](https://github.com/RMAAPK/dmcps/actions/workflows/test.yml)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](https://mariadb.com/bsl11/)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.thealidev/dmcps-success)](https://registry.modelcontextprotocol.io/)

**🚀 BUILT FOR THE GOOGLE CLOUD RUN TAKEOVER HACKATHON 🚀**

DMCPS V3 is the ultimate enterprise-grade sandbox for AI coding agents, completely re-engineered to run natively on **Google Cloud Run**. By utilizing Google's serverless container infrastructure, you can give AI agents (like Claude Desktop, Cursor, or Gemini) full terminal and filesystem execution without ever risking your host machine.

<p align="center">
  <a href="https://www.producthunt.com/products/dmcps/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-dmcps" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1333432&theme=neutral" alt="DMCPS - Secure Docker sandbox for AI agent filesystem & shell access | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</p>

## 🌟 Hackathon Exclusive Features

1. **Native Google Cloud Run Architecture:** Zero-friction automated deployments via `cloudbuild.yaml`. Designed from the ground up to utilize Google's serverless containers.
2. **Product Hunt PKCE OAuth Flow:** The web dashboard is secured using Product Hunt's official API. Authenticate your makers and manage your AI sandbox instantly using your Product Hunt account.
3. **Enterprise Open Source (BSL-1.1):** Codebase is fully open for developers to inspect the kernel-level protections and deploy to their own GCP environment, while legally protecting commercial/enterprise use.
4. **Kernel-Level Locks:** Non-root Alpine execution with dropped Linux capabilities (`cap_drop: ALL`).
5. **Absolute Root Illusion:** The AI is assigned a direct `root` user within the disposable container, tricking it into feeling absolute freedom without any "Permission denied" frustrations, keeping it from getting stuck in looping errors.

---

## 🚀 Getting Started on Google Cloud

Deploying DMCPS V3 is incredibly simple using **Google Cloud Build**.

1. Navigate to **Cloud Build Triggers** in your Google Cloud Console.
2. Click **Connect Repository** and link this GitHub repository.
3. Set the trigger to watch the `v3-beta` branch.
4. Point the configuration to the included `/cloudbuild.yaml` file.
5. Click **Run**.

Google Cloud Build will automatically build the container, push it to your Container Registry, and deploy it as a highly scalable **Google Cloud Run** service!

---

## 🔒 Security & Dashboard Whitelisting

This is built as a robust **Node.js/Express backend daemon**, featuring a "military-grade" secured dashboard to strictly manage which directories the AI is allowed to touch.

- **Strict Whitelisting**: The AI cannot read, write, or execute commands outside of directories explicitly whitelisted via the web dashboard. (Directory traversal attempts like `../` are mathematically blocked).
- **Product Hunt Integration**: Secure login restricted to Product Hunt makers using PKCE OAuth 2.0 flow.
- **Auto-Generated API Keys**: Connect to your MCP server using a dynamically generated Bearer token to ensure only authorized agents can execute tools on your server.
- **Pre-installed AI Toolkit**: Foundational tools (`git`, `python3`, `curl`, `bash`, `make`, `jq`) are pre-baked into the image so the AI is immediately ready to work.

## 🛠️ MCP Tools Exposed to the AI
Once authenticated and restricted to a whitelisted folder, the AI has access to:
1. `ph_graphql_query` - Run deep analytics queries against the Product Hunt API.
2. `read_file` - Read text from a file.
3. `write_file` - Write content to a file.
4. `list_directory` - List all files in a folder.
5. `run_shell_command` - Execute terminal commands strictly within the isolated workspace.

---

## 🧪 Local Testing

You can easily test the entire stack locally or on an AWS instance before pushing to Google Cloud Run:

```bash
git clone -b v3-beta https://github.com/RMAAPK/dmcps.git
cd dmcps
git checkout v3-beta
docker compose up -d --build
```
*Note: Ensure you port-forward to `https://localhost:5000` to properly test the Product Hunt OAuth Redirect URI.*
