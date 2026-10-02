import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import { isPathAllowed } from "./config.js";

const execAsync = promisify(exec);
const mcpServer = new Server({ name: "secure-sandbox-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            { name: "read_file", description: "Read a file", inputSchema: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
            { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } }, required: ["filePath", "content"] } },
            { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string" } }, required: ["dirPath"] } },
            { name: "run_shell_command", description: "Run a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string" } }, required: ["command", "cwd"] } },
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

async function run() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Secure Sandbox MCP Server running on stdio (configured via dashboard)");
}

run().catch(console.error);
