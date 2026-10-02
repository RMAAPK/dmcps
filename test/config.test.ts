import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Security Config - isPathAllowed', () => {
    let testConfigPath: string;
    let isPathAllowed: (p: string) => Promise<boolean>;

    beforeAll(async () => {
        // Create a real temporary file for testing
        testConfigPath = path.join(os.tmpdir(), 'test_allowed_dirs.json');
        process.env.CONFIG_PATH = testConfigPath;
        
        await fs.writeFile(testConfigPath, JSON.stringify({
            allowedDirectories: [path.resolve('/projects/allowed1'), path.resolve('/projects/allowed2')]
        }));

        // Dynamically import AFTER setting the env var
        const configModule = await import('../src/config.js');
        isPathAllowed = configModule.isPathAllowed;
    });

    afterAll(async () => {
        try { await fs.unlink(testConfigPath); } catch (e) {}
    });

    it('should allow exact match of allowed directory', async () => {
        const allowed = await isPathAllowed('/projects/allowed1');
        expect(allowed).toBe(true);
    });

    it('should allow nested path inside allowed directory', async () => {
        const allowed = await isPathAllowed('/projects/allowed1/subfolder/file.txt');
        expect(allowed).toBe(true);
    });

    it('should DENY path outside allowed directory', async () => {
        const allowed = await isPathAllowed('/projects/forbidden');
        expect(allowed).toBe(false);
    });

    it('should DENY path traversal attempts (e.g. ../)', async () => {
        const allowed = await isPathAllowed('/projects/allowed1/../../etc/passwd');
        expect(allowed).toBe(false);
    });
    
    it('should DENY path suffix attacks', async () => {
        const allowed = await isPathAllowed('/projects/allowed1_hacked');
        expect(allowed).toBe(false);
    });
});

