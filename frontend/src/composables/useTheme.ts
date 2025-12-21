// Theme composable for consistent theme management across components

import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'sheltie-theme'

export type Theme = 'dark' | 'light'

// Create a shared ref for the theme
const globalTheme = ref<Theme>('dark')
let initialized = false

export function useTheme() {
    const theme = globalTheme

    // Initialize theme from localStorage (only once)
    const initTheme = () => {
        if (initialized) return
        initialized = true

        const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null
        if (savedTheme) {
            theme.value = savedTheme
            document.documentElement.setAttribute('data-theme', savedTheme)
        }
    }

    // Toggle between dark and light theme
    const toggleTheme = () => {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
        localStorage.setItem(STORAGE_KEY, theme.value)
        document.documentElement.setAttribute('data-theme', theme.value)
    }

    // Set a specific theme
    const setTheme = (newTheme: Theme) => {
        theme.value = newTheme
        localStorage.setItem(STORAGE_KEY, newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    // Auto-init on mount
    onMounted(initTheme)

    return {
        theme,
        toggleTheme,
        setTheme,
        initTheme
    }
}
