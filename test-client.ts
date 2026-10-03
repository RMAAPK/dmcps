import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./src/config.js";

async function testConnection() {
    const config = await loadConfig();
    console.log(`🔌 Connecting to AWS MCP Server via SSE (13.54.30.28) with API Key: ${config.apiKey}...`);
    
    // Connect to the remote AWS endpoint
    const url = new URL("http://13.54.30.28:3000/sse");
    const transport = new SSEClientTransport(url, { headers: { "Authorization": "Bearer " + config.apiKey } });
    
    const client = new Client({ name: "antigravity-agent", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    
    console.log("✅ Successfully Handshaked with AWS Server!");
    console.log("🔍 Fetching available tools from the sandbox...");
    
    const response = await client.request(ListToolsRequestSchema, {});
    
    console.log("\n🛠️ Tools exposed by your AWS Sandbox:");
    response.tools.forEach(t => console.log(` - ${t.name}: ${t.description}`));
    
    console.log("\nConnection successful. The AI can now remotely operate the server!");
    process.exit(0);
}

testConnection().catch(err => {
    console.error("Connection failed:", err);
    process.exit(1);
});
