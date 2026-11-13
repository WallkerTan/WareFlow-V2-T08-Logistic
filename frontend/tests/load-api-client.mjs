// Executes the production TypeScript API client in Node; no alternative API implementation.
import ts from 'typescript';
import { readFile, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadApiClient({ baseURL = '/api', getAuthSession = () => null, clearAuthSession = () => {} } = {}) {
    const key = `wareflow.api-check.${Math.random()}`;
    globalThis[Symbol.for(key)] = { getAuthSession, clearAuthSession };
    globalThis.window ??= globalThis;
    const source = (await readFile(new URL('../src/services/api.ts', import.meta.url), 'utf8'))
        .replace(/import\s*\{[^}]+\}\s*from\s*['"]\.\/session['"];?/, `const { getAuthSession, clearAuthSession } = globalThis[Symbol.for(${JSON.stringify(key)})];`)
        .replaceAll('import.meta.env', JSON.stringify({ VITE_API_BASE_URL: baseURL }));
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    const folder = await mkdtemp(path.join(tmpdir(), 'wareflow-api-check-'));
    const modulePath = path.join(folder, 'client.mjs');
    try {
        await writeFile(modulePath, result.outputText);
        return await import(pathToFileURL(modulePath).href);
    } finally {
        delete globalThis[Symbol.for(key)];
        await unlink(modulePath).catch(() => {});
        await rmdir(folder).catch(() => {});
    }
}
