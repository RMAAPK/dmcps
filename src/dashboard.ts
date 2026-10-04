import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, saveConfig, isPathAllowed } from './config.js';
import ngrok from '@ngrok/ngrok';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ---------------- MIDDLEWARE & SECURITY ----------------
app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, 
    legacyHeaders: false, 
});
app.use(limiter);

// We MUST NOT use global body parsers for /message or /mcp/message, because the MCP SDK needs to read the raw request stream!
app.use((req, res, next) => {
    if (req.path === '/message' || req.path === '/sse' || req.path.startsWith('/mcp')) {
        return next();
    }
    // Only apply body parsing to the dashboard
    express.urlencoded({ extended: true })(req, res, (err) => {
        if (err) return next(err);
        express.json()(req, res, next);
    });
});

// Basic Authentication Middleware for Dashboard ONLY
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [user, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    
    if (user === 'admin' && password === ADMIN_PASSWORD) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Sandbox Dashboard"');
    res.status(401).send('Authentication required.');
};

// ---------------- DASHBOARD UI ----------------
const activeConnections = new Set<string>();

app.get('/', authMiddleware, async (req, res) => {
    const config = await loadConfig();
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>DMCPS Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f9; margin: 0; padding: 20px; color: #333; }
                .container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                h1, h3 { color: #2c3e50; margin-top: 0; }
                ul { list-style: none; padding: 0; }
                li { background: #e9ecef; margin: 10px 0; padding: 15px; border-radius: 4px; display: flex; flex-direction: column; gap: 10px; word-break: break-all; }
                @media (min-width: 600px) {
                    li { flex-direction: row; justify-content: space-between; align-items: center; }
                }
                button { background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 1rem; }
                button.danger { background: #dc3545; }
                @media (min-width: 600px) { button { width: auto; } }
                input[type="text"] { padding: 10px; flex-grow: 1; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 1rem; }
                .form-group { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
                @media (min-width: 600px) { .form-group { flex-direction: row; } }
                .config-box { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; margin-top: 10px; border: 1px solid #333; }
                .key-highlight { font-weight: bold; color: #4CAF50; font-size: 1.1em; background: #e8f5e9; padding: 2px 6px; border-radius: 4px; border: 1px solid #c8e6c9; }
                .badge { background: #28a745; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛡️ MCP Sandbox Security Dashboard</h1>
                <p>Manage which directories the AI agent is allowed to access. Any path outside these directories will be strictly blocked.</p>
                
                <h3>🔑 Server API Key</h3>
                <p>This auto-generated key authenticates AI agents connecting to this server.</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; margin-bottom: 20px;">
                    <span class="key-highlight">${config.apiKey}</span>
                </div>

                <h3>🔌 Active AI Connections <span class="badge">${activeConnections.size}</span></h3>
                <ul>
                    ${activeConnections.size === 0 ? '<li><i>No active connections.</i></li>' : Array.from(activeConnections).map(ip => `<li>🟢 Connected Client IP: ${ip}</li>`).join('')}
                </ul>

                <h3>📋 Cursor / Claude Configuration</h3>
                <p>Copy this JSON snippet into your AI agent's MCP settings:</p>
                <div class="config-box">{
  "mcpServers": {
    "dmcps-aws": {
      "command": "curl",
      "args": ["-N", "-s", "-H", "Authorization: Bearer ${config.apiKey}", "http://YOUR_SERVER_IP:${PORT}/sse"]
    }
  }
}</div>
                <p><small><i>Raw Clients / Browsers: Use <code>http://YOUR_SERVER_IP:${PORT}/mcp?key=${config.apiKey}</code></i></small></p>
                
                <h3>📂 Currently Allowed Directories</h3>
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

app.post('/add', authMiddleware, async (req, res) => {
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

app.post('/remove', authMiddleware, async (req, res) => {
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

// ---------------- API KEY AUTH & SSE TRANSPORT ----------------
const transports = new Map<string, SSEServerTransport>();

const mcpAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const config = await loadConfig();
    const providedKey = req.query.key || (req.headers.authorization || '').replace('Bearer ', '').trim();
    
    if (providedKey !== config.apiKey) {
        return res.status(401).json({ error: "Unauthorized. Invalid or missing API Key. Check your dashboard for the correct key." });
    }
    next();
};

app.use(['/sse', '/message', '/mcp', '/mcp/message'], mcpAuthMiddleware);

const handleSseConnection = async (req: express.Request, res: express.Response) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    activeConnections.add(clientIp);
    console.log(`New MCP Client connected via SSE from ${clientIp}`);
    
    // Dynamically construct the POST endpoint so raw agents sending ?key= preserve their authentication
    const basePath = req.path === '/mcp' ? '/mcp/message' : '/message';
    const messageUrl = req.query.key ? `${basePath}?key=${req.query.key}` : basePath;
    
    const transport = new SSEServerTransport(messageUrl, res);
    await mcpServer.connect(transport);
    
    // Store the transport so the POST /message endpoint can find it
    transports.set(transport.sessionId, transport);

    req.on('close', () => {
        activeConnections.delete(clientIp);
        transports.delete(transport.sessionId);
        console.log(`MCP Client disconnected: ${clientIp}`);
    });
};

app.get('/sse', handleSseConnection);
app.get('/mcp', handleSseConnection);

const handleMessage = async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(404).send("Session not found or expired");
    }
};

app.post('/message', handleMessage);
app.post('/mcp/message', handleMessage);

// ---------------- VERCEL / SERVERLESS EXPORT ----------------
if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', async () => {
        console.log(`🚀 Secure Dashboard & MCP Server listening on port ${PORT}`);
        
        if (process.env.NGROK_AUTHTOKEN) {
            try {
                const listener = await ngrok.forward({
                    addr: PORT,
                    authtoken: process.env.NGROK_AUTHTOKEN,
                });
                console.log(`🌍 Public ngrok Dashboard: ${listener.url()}/`);
            } catch (err) {
                console.error("❌ Failed to start ngrok tunnel:", err);
            }
        }
    });
}

export default app;
