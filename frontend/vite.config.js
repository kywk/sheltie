import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

const borderCollieRoot = fileURLToPath(new URL('../border-collie/src', import.meta.url));
const frontendSrc = fileURLToPath(new URL('./src', import.meta.url));

/**
 * Vite plugin that resolves @/ imports from border-collie source files
 * to border-collie/src/ instead of frontend/src/
 */
/**
 * Vite plugin: rewrite @/ imports in border-collie files to absolute paths.
 * This runs BEFORE vite:import-analysis sees the import strings.
 */
function borderCollieAliasPlugin() {
    return {
        name: 'border-collie-alias',
        enforce: 'pre',
        transform(code, id) {
            // Only rewrite files inside border-collie/src/
            if (!id.includes('/border-collie/src/')) return null;
            // Replace @/ with the absolute border-collie root
            const rewritten = code.replace(/from\s+['"]@\//g, `from '${borderCollieRoot}/`);
            if (rewritten !== code) {
                return { code: rewritten, map: null };
            }
            return null;
        }
    };
}


export default defineConfig({
    plugins: [vue(), borderCollieAliasPlugin()],
    resolve: {
        alias: {
            '@': frontendSrc
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true
            },
            '/ws': {
                target: 'ws://localhost:8080',
                ws: true
            }
        }
    }
});


