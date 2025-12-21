import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAdminStore = defineStore('admin', () => {
    const token = ref<string | null>(localStorage.getItem('sheltie-admin-token'))
    const isAuthenticated = ref(!!token.value)

    const login = async (password: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })

            if (!response.ok) return false

            const data = await response.json()
            token.value = data.token
            isAuthenticated.value = true
            localStorage.setItem('sheltie-admin-token', data.token)
            return true
        } catch {
            return false
        }
    }

    const logout = () => {
        const currentToken = token.value
        token.value = null
        isAuthenticated.value = false
        localStorage.removeItem('sheltie-admin-token')
        if (currentToken) {
            fetch('/api/admin/logout', {
                method: 'POST',
                headers: { 'Authorization': currentToken }
            })
        }
    }

    const getAuthHeaders = () => ({
        'Authorization': token.value || '',
        'Content-Type': 'application/json'
    })

    return {
        token,
        isAuthenticated,
        login,
        logout,
        getAuthHeaders
    }
})
