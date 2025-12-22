import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Workspace {
    id: string
    name: string
    description: string
    content: string
    createdAt: string
    updatedAt: string
}

export interface WorkspaceListItem {
    id: string
    name: string
    description: string
    updatedAt: string
}

// User presence with cursor position
export interface UserPresence {
    id: string
    username: string
    color: string
    cursorPosition: number | null
    selectionStart: number | null
    selectionEnd: number | null
    lastSeen: number
}

// Color palette for users (like Google Docs)
const USER_COLORS = [
    '#4285f4', // Blue
    '#ea4335', // Red
    '#fbbc04', // Yellow
    '#34a853', // Green
    '#9334e6', // Purple
    '#ff6d01', // Orange
    '#46bdc6', // Cyan
    '#e91e63', // Pink
]

// Animal emojis for user icons
const USER_ICONS = ['🐕', '🐈', '🐇', '🦊', '🐻', '🐼', '🦁', '🐯']

export const useWorkspaceStore = defineStore('workspace', () => {
    const currentWorkspace = ref<Workspace | null>(null)
    const workspaceList = ref<WorkspaceListItem[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // WebSocket connection
    const ws = ref<WebSocket | null>(null)
    const isConnected = ref(false)

    // User presence tracking
    const currentUserId = ref<string>('')
    const currentUsername = ref<string>('')
    const users = ref<Map<string, UserPresence>>(new Map())

    // Version control
    const documentVersion = ref<number>(0)
    const documentHash = ref<string>('')
    const pendingChanges = ref<boolean>(false)

    // Get list of other connected users (excluding self)
    const otherUsers = computed(() => {
        return Array.from(users.value.values()).filter(u => u.id !== currentUserId.value)
    })

    // Get user count
    const userCount = computed(() => users.value.size)

    // Assign color based on user index
    const getUserColor = (userId: string): string => {
        const userIds = Array.from(users.value.keys())
        const index = userIds.indexOf(userId)
        return USER_COLORS[index % USER_COLORS.length]
    }

    // Assign icon based on user index
    const getUserIcon = (userId: string): string => {
        const userIds = Array.from(users.value.keys())
        const index = userIds.indexOf(userId)
        return USER_ICONS[index % USER_ICONS.length]
    }

    const fetchWorkspace = async (id: string) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await fetch(`/api/workspaces/${id}`)
            if (!response.ok) throw new Error('Workspace not found')
            currentWorkspace.value = await response.json()
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch workspace'
        } finally {
            isLoading.value = false
        }
    }

    const saveWorkspace = async () => {
        if (!currentWorkspace.value) return
        try {
            await fetch(`/api/workspaces/${currentWorkspace.value.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: currentWorkspace.value.content })
            })
        } catch (e) {
            console.error('Failed to save workspace:', e)
        }
    }

    const connectWebSocket = (workspaceId: string, username: string = 'Anonymous') => {
        if (ws.value) {
            ws.value.close()
        }

        // Generate unique user ID
        currentUserId.value = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        currentUsername.value = username

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/ws/${workspaceId}?userId=${encodeURIComponent(currentUserId.value)}&username=${encodeURIComponent(username)}`

        ws.value = new WebSocket(wsUrl)

        ws.value.onopen = () => {
            isConnected.value = true
            console.log('WebSocket connected')

            // Add self to users
            users.value.set(currentUserId.value, {
                id: currentUserId.value,
                username: username,
                color: getUserColor(currentUserId.value),
                cursorPosition: null,
                selectionStart: null,
                selectionEnd: null,
                lastSeen: Date.now()
            })
        }

        ws.value.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data)

                switch (message.type) {
                    case 'content':
                        if (currentWorkspace.value) {
                            if (message.conflict) {
                                // Conflict detected - show warning and update to server version
                                console.warn('Content conflict detected, updating to server version')
                                // Could show a toast notification here
                            }
                            
                            // Always update to the server's version
                            currentWorkspace.value.content = message.content
                            documentVersion.value = message.version || 0
                            documentHash.value = message.hash || ''
                            pendingChanges.value = false
                        }
                        break

                    case 'join':
                        users.value.set(message.userId, {
                            id: message.userId,
                            username: message.username,
                            color: getUserColor(message.userId),
                            cursorPosition: null,
                            selectionStart: null,
                            selectionEnd: null,
                            lastSeen: Date.now()
                        })
                        break

                    case 'leave':
                        users.value.delete(message.userId)
                        break

                    case 'cursor':
                        // Update cursor position for remote user
                        if (message.userId !== currentUserId.value) {
                            const user = users.value.get(message.userId)
                            if (user) {
                                user.cursorPosition = message.position
                                user.selectionStart = message.selectionStart
                                user.selectionEnd = message.selectionEnd
                                user.lastSeen = Date.now()
                            }
                        }
                        break

                    case 'users':
                        // Sync user list from server
                        users.value.clear()
                        for (const u of message.users) {
                            users.value.set(u.userId, {
                                id: u.userId,
                                username: u.username,
                                color: getUserColor(u.userId),
                                cursorPosition: u.cursorPosition ?? null,
                                selectionStart: null,
                                selectionEnd: null,
                                lastSeen: Date.now()
                            })
                        }
                        // Initialize version info if this is the first sync
                        if (message.version !== undefined) {
                            documentVersion.value = message.version
                            documentHash.value = message.hash || ''
                        }
                        break
                }
            } catch (e) {
                console.error('Failed to parse WebSocket message:', e)
            }
        }

        ws.value.onclose = () => {
            isConnected.value = false
            users.value.clear()
            console.log('WebSocket disconnected')
        }

        ws.value.onerror = (error) => {
            console.error('WebSocket error:', error)
        }
    }

    const sendContent = (content: string) => {
        if (ws.value && ws.value.readyState === WebSocket.OPEN) {
            pendingChanges.value = true
            ws.value.send(JSON.stringify({
                type: 'content',
                content,
                version: documentVersion.value,
                hash: documentHash.value
            }))
        }
    }

    // Send cursor position to other users
    const sendCursor = (position: number, selectionStart?: number, selectionEnd?: number) => {
        if (ws.value && ws.value.readyState === WebSocket.OPEN) {
            ws.value.send(JSON.stringify({
                type: 'cursor',
                userId: currentUserId.value,
                position,
                selectionStart: selectionStart ?? position,
                selectionEnd: selectionEnd ?? position
            }))
        }
    }

    const disconnectWebSocket = () => {
        if (ws.value) {
            ws.value.close()
            ws.value = null
        }
        isConnected.value = false
        users.value.clear()
        currentUserId.value = ''
    }

    const updateContent = (content: string) => {
        if (currentWorkspace.value) {
            currentWorkspace.value.content = content
            sendContent(content)
        }
    }

    return {
        currentWorkspace,
        workspaceList,
        isLoading,
        error,
        isConnected,
        users,
        otherUsers,
        userCount,
        currentUserId,
        currentUsername,
        documentVersion,
        documentHash,
        pendingChanges,
        getUserColor,
        getUserIcon,
        fetchWorkspace,
        saveWorkspace,
        connectWebSocket,
        disconnectWebSocket,
        updateContent,
        sendCursor
    }
})
