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
            // These specific modules are only used inside border-collie components
            { find: '@/stores/projectStore', replacement: `${borderCollieRoot}/stores/projectStore` },
            { find: '@/composables/useGanttScale', replacement: `${borderCollieRoot}/composables/useGanttScale` },
            { find: '@/shared/composables/useGanttScale', replacement: `${borderCollieRoot}/shared/composables/useGanttScale` },
            { find: '@/parser/textParser', replacement: `${borderCollieRoot}/parser/textParser` },
            { find: /^@\/types(.*)$/, replacement: `${borderCollieRoot}/types$1` },
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

