import * as fs from "fs/promises";
import * as path from "path";

// Vercel serverless functions have a read-only filesystem except for /tmp
const defaultPath = process.env.VERCEL ? "/tmp/allowed_dirs.json" : "/app/config/allowed_dirs.json";
const CONFIG_PATH = process.env.CONFIG_PATH || defaultPath;

import { randomBytes } from 'crypto';

export interface Config {
    allowedDirectories: string[];
    allowedSudoCommands: string[];
    allowedFirewallRules: string[];
    apiKey: string;
}

let cachedConfig: Config | null = null;

export async function loadConfig(): Promise<Config> {
    if (cachedConfig) return cachedConfig;
    
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        if (!parsed.apiKey || process.env.MCP_API_KEY) {
            parsed.apiKey = process.env.MCP_API_KEY || ('mcp_' + randomBytes(16).toString('hex'));
            await saveConfig(parsed);
        }
        
        // Ensure defaults exist for new properties
        if (!parsed.allowedDirectories) parsed.allowedDirectories = ["/tmp"];
        if (!parsed.allowedDirectories.includes("/tmp")) parsed.allowedDirectories.push("/tmp");
        if (!parsed.allowedSudoCommands) parsed.allowedSudoCommands = ["apk add"];
        if (!parsed.allowedSudoCommands.includes("apk add")) parsed.allowedSudoCommands.push("apk add");
        if (!parsed.allowedFirewallRules) parsed.allowedFirewallRules = [];
        
        cachedConfig = parsed;
        return parsed;
    } catch {
        // Default safe config
        const newConfig = { 
            allowedDirectories: ["/tmp"], 
            allowedSudoCommands: ["apk add"],
            allowedFirewallRules: [],
            apiKey: process.env.MCP_API_KEY || ('mcp_' + randomBytes(16).toString('hex'))
        };
        await saveConfig(newConfig).catch(() => {});
        cachedConfig = newConfig;
        return newConfig;
    }
}

export async function saveConfig(config: Config): Promise<void> {
    cachedConfig = config;
    try {
        await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
        await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
        // In read-only containers, writing will fail, but we've already cached it in memory!
        console.warn('Could not persist config to disk, but it is cached in memory:', err);
    }
}

/**
 * Validates if the target path is strictly within any of the configured allowed directories.
 */
export async function isPathAllowed(targetPath: string): Promise<boolean> {
    const config = await loadConfig();
    const resolved = path.resolve(targetPath);
    
    for (const dir of config.allowedDirectories) {
        const allowedDir = path.resolve(dir);
        // Ensure the path is exactly the allowed dir or a child of it
        if (resolved === allowedDir || resolved.startsWith(allowedDir + path.sep)) {
            return true;
        }
    }
    return false;
}
