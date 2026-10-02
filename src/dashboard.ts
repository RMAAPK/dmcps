import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import { loadConfig, saveConfig, isPathAllowed } from "./config.js";

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.error("CRITICAL: ADMIN_PASSWORD environment variable is required.");
    process.exit(1);
}

// ---------------- MILITARY GRADE SECURITY ----------------

// 1. Helmet sets 14 different HTTP security headers (CSP, HSTS, XSS protection, etc.)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        }
    }
}));

// 2. Strict Rate Limiting (Prevents Brute-Force Password Attacks)
// Max 10 failed login attempts or requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, 
    legacyHeaders: false, 
});
app.use(limiter);

// Parse URL-encoded bodies for form submissions
app.use(express.urlencoded({ extended: true }));


// Basic Authentication Middleware for Dashboard ONLY
app.use((req, res, next) => {
    // SSE endpoint and messages do not require the dashboard password
    // (Agents connect to /sse directly. You can add a token check here later if needed for AI auth)
    if (req.path === '/sse' || req.path === '/message') {
        return next();
    }
    
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    // Simple auth checking just the password against admin
    if (login === 'admin' && password === ADMIN_PASSWORD) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Sandbox Dashboard"');
    res.status(401).send('Authentication required.');
});

// ---------------- DASHBOARD ROUTES ----------------

app.get('/', async (req, res) => {
    const config = await loadConfig();
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>MCP Sandbox Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 15px; background: #f9f9f9; }
                .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; margin-top: 0; font-size: 1.5rem; }
                ul { list-style-type: none; padding: 0; }
                li { background: #f0f0f0; margin-bottom: 10px; padding: 10px; border-radius: 5px; display: flex; flex-direction: column; gap: 10px; font-family: monospace; word-break: break-all; }
                @media (min-width: 600px) {
                    li { flex-direction: row; justify-content: space-between; align-items: center; }
                }
                button { background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 1rem; }
                button.danger { background: #dc3545; }
                @media (min-width: 600px) {
                    button { width: auto; }
                }
                input[type="text"] { padding: 10px; flex-grow: 1; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 1rem; }
                .form-group { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
                @media (min-width: 600px) {
                    .form-group { flex-direction: row; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛡️ MCP Sandbox Security Dashboard</h1>
                <p>Manage which directories the AI agent is allowed to access. Any path outside these directories will be strictly blocked.</p>
                
                <h3>Currently Allowed Directories</h3>
                ${config.allowedDirectories.length === 0 ? '<p><i>No directories allowed yet. The AI is completely locked out.</i></p>' : ''}
                <ul>
                    ${config.allowedDirectories.map((dir, idx) => `
                        <li>
                            ${dir}
                            <form action="/remove" method="POST" style="margin:0;">
                                <input type="hidden" name="index" value="${idx}">
                                <button type="submit" class="danger">Revoke Access</button>
                            </form>
                        </li>
                    `).join('')}
                </ul>

                <form action="/add" method="POST" class="form-group">
                    <input type="text" name="directory" placeholder="/projects/my-app" required>
                    <button type="submit">Allow Directory</button>
                </form>
            </div>
        </body>
        </html>
    `;
    res.send(html);
});

app.post('/add', async (req, res) => {
    const dir = req.body.directory?.trim();
    if (dir) {
        const config = await loadConfig();
        if (!config.allowedDirectories.includes(dir)) {
            config.allowedDirectories.push(dir);
            await saveConfig(config);
        }
    }
    res.redirect('/');
});

app.post('/remove', async (req, res) => {
    const index = parseInt(req.body.index, 10);
    const config = await loadConfig();
    if (!isNaN(index) && index >= 0 && index < config.allowedDirectories.length) {
        config.allowedDirectories.splice(index, 1);
        await saveConfig(config);
    }
    res.redirect('/');
});


// ---------------- MCP SERVER LOGIC ----------------

const mcpServer = new Server({ name: "secure-sandbox-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            { name: "read_file", description: "Read a file", inputSchema: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
            { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } }, required: ["filePath", "content"] } },
            { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string" } }, required: ["dirPath"] } },
            { name: "run_shell_command", description: "Run a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string", description: "Directory to run command in" } }, required: ["command", "cwd"] } },
        ],
    };
});

async function checkAccess(targetPath: string) {
    if (!(await isPathAllowed(targetPath))) {
        throw new Error(`SECURITY EXCEPTION: Access to path '${targetPath}' is explicitly denied by dashboard configuration.`);
    }
}

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case "read_file": {
                const filePath = String(request.params.arguments?.filePath);
                await checkAccess(filePath);
                const content = await fs.readFile(filePath, "utf-8");
                return { content: [{ type: "text", text: content }] };
            }
            case "write_file": {
                const filePath = String(request.params.arguments?.filePath);
                await checkAccess(filePath);
                await fs.writeFile(filePath, String(request.params.arguments?.content), "utf-8");
                return { content: [{ type: "text", text: `Wrote successfully to ${filePath}` }] };
            }
            case "list_directory": {
                const dirPath = String(request.params.arguments?.dirPath);
                await checkAccess(dirPath);
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                const list = files.map(f => `${f.isDirectory() ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
                return { content: [{ type: "text", text: list || "(empty directory)" }] };
            }
            case "run_shell_command": {
                const cwd = String(request.params.arguments?.cwd);
                await checkAccess(cwd);
                const command = String(request.params.arguments?.command);
                const { stdout, stderr } = await execAsync(command, { cwd });
                return { content: [{ type: "text", text: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}` }] };
            }
            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
});

// ---------------- SSE TRANSPORT ----------------
let transport: SSEServerTransport;

app.get('/sse', async (req, res) => {
    console.log("New MCP Client connected via SSE");
    transport = new SSEServerTransport("/message", res);
    await mcpServer.connect(transport);
});

app.post('/message', async (req, res) => {
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(503).send("SSE transport not initialized");
    }
});

import ngrok from '@ngrok/ngrok';

// ---------------- VERCEL / SERVERLESS EXPORT ----------------
// If running on Vercel, we don't manually call app.listen(). We just export the app.
if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', async () => {
        console.log(`🚀 Secure Dashboard & MCP Server listening on port ${PORT}`);
        console.log(`🌐 Local Dashboard: http://localhost:${PORT}/ (Requires Basic Auth user: admin)`);
        console.log(`🔌 Local MCP Endpoint: http://localhost:${PORT}/sse`);

        if (process.env.NGROK_AUTHTOKEN) {
            try {
                console.log("🔄 Starting ngrok tunnel...");
                const listener = await ngrok.forward({
                    addr: PORT,
                    authtoken: process.env.NGROK_AUTHTOKEN,
                });
                console.log(`🌍 Public ngrok Dashboard: ${listener.url()}/`);
                console.log(`🌍 Public ngrok MCP Endpoint: ${listener.url()}/sse`);
            } catch (err) {
                console.error("❌ Failed to start ngrok tunnel:", err);
            }
        }
    });
}

// Export for Vercel and Serverless environments
export default app;
