import { jest } from '@jest/globals';
import * as path from 'path';

// Mock fs to avoid touching the real filesystem during tests
jest.unstable_mockModule('fs/promises', () => ({
    readFile: jest.fn().mockResolvedValue(JSON.stringify({
        allowedDirectories: [path.resolve('/projects/allowed1'), path.resolve('/projects/allowed2')]
    })),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
}));

describe('Security Config - isPathAllowed', () => {
    it('should allow exact match of allowed directory', async () => {
        const { isPathAllowed } = await import('../src/config.js');
        const allowed = await isPathAllowed('/projects/allowed1');
        expect(allowed).toBe(true);
    });

    it('should allow nested path inside allowed directory', async () => {
        const { isPathAllowed } = await import('../src/config.js');
        const allowed = await isPathAllowed('/projects/allowed1/subfolder/file.txt');
        expect(allowed).toBe(true);
    });

    it('should DENY path outside allowed directory', async () => {
        const { isPathAllowed } = await import('../src/config.js');
        const allowed = await isPathAllowed('/projects/forbidden');
        expect(allowed).toBe(false);
    });

    it('should DENY path traversal attempts (e.g. ../)', async () => {
        const { isPathAllowed } = await import('../src/config.js');
        // Traversal trick: starts with allowed but goes back
        const allowed = await isPathAllowed('/projects/allowed1/../../etc/passwd');
        expect(allowed).toBe(false);
    });
    
    it('should DENY path suffix attacks', async () => {
        const { isPathAllowed } = await import('../src/config.js');
        // Attack trick: `/projects/allowed1_hacked` starts with `/projects/allowed1` but is a different folder
        const allowed = await isPathAllowed('/projects/allowed1_hacked');
        expect(allowed).toBe(false);
    });
});

