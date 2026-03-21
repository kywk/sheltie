import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const borderCollieRoot = fileURLToPath(new URL('../border-collie/src', import.meta.url))
const frontendSrc = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: [
            // Border-collie internal @/ imports — must come before the general @ alias
            { find: /^@\/shared\/(.*)$/, replacement: `${borderCollieRoot}/shared/$1` },
            { find: '@/stores/projectStore', replacement: `${borderCollieRoot}/stores/projectStore` },
            { find: '@/stores/workspaceStore', replacement: `${borderCollieRoot}/stores/workspaceStore` },
            { find: '@/composables/useGanttScale', replacement: `${borderCollieRoot}/composables/useGanttScale` },
            { find: /^@\/parser\/(.*)$/, replacement: `${borderCollieRoot}/parser/$1` },
            { find: /^@\/types(.*)$/, replacement: `${borderCollieRoot}/types$1` },
            { find: '@/utils/sharing', replacement: `${borderCollieRoot}/utils/sharing` },
            { find: '@/utils/gist', replacement: `${borderCollieRoot}/utils/gist` },
            { find: '@/utils/urlSource', replacement: `${borderCollieRoot}/utils/urlSource` },
            { find: '@/utils/exporter', replacement: `${borderCollieRoot}/utils/exporter` },
            // Default: @/ resolves to frontend/src/ for all other imports
            { find: '@', replacement: frontendSrc }
        ]
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
})

