<template>
  <div class="workspace-view" :data-theme="theme">
    <SplitPane :initial-ratio="0.4" :min-left="320" :min-right="400">
      <template #left>
        <!-- Editor Panel -->
        <div class="panel editor-panel">
          <div class="panel-header">
            <!-- Left: Brand with workspace name + connection status -->
            <div class="header-left">
              <router-link to="/" class="brand-logo">
                🐕 {{ workspace?.name || 'Sheltie' }}
              </router-link>
              <!-- Connection indicator -->
              <span 
                class="connection-indicator" 
                :class="{ connected: isConnected }"
                :title="isConnected ? `已連線 (${userCount} 人在線)` : '離線'"
              >
                <span class="indicator-dot"></span>
              </span>
              <!-- Other users avatars -->
              <div v-if="otherUsers.length > 0" class="user-avatars">
                <div 
                  v-for="user in otherUsers.slice(0, 5)" 
                  :key="user.id"
                  class="user-avatar"
                  :style="{ backgroundColor: user.color }"
                  :title="user.username"
                >
                  {{ store.getUserIcon(user.id) }}
                </div>
                <div v-if="otherUsers.length > 5" class="user-avatar more">
                  +{{ otherUsers.length - 5 }}
                </div>
              </div>
            </div>
            <!-- Right: Controls -->
            <div class="header-right">
              <div class="toggle-group">
                <button
                  class="btn btn-ghost"
                  :class="{ active: editorMode === 'text' }"
                  @click="editorMode = 'text'"
                >
                  純文字
                </button>
                <button
                  class="btn btn-ghost"
                  :class="{ active: editorMode === 'wysiwyg' }"
                  @click="editorMode = 'wysiwyg'"
                >
                  WYSIWYG
                </button>
              </div>
              <button class="btn btn-ghost share-btn" @click="copyShareUrl" title="複製分享連結">
                <span class="icon">🔗</span>
                <span>{{ shareButtonText }}</span>
              </button>
            </div>
          </div>
          <div class="panel-content editor-container">
            <!-- Text editor with cursor overlay -->
            <div v-if="editorMode === 'text'" class="editor-wrapper">
              <textarea
                ref="textareaRef"
                class="editor-textarea"
                v-model="content"
                @input="onContentChange"
                @keyup="onCursorChange"
                @click="onCursorChange"
                @select="onCursorChange"
                placeholder="輸入專案 Markdown..."
              ></textarea>
              <!-- Remote cursors overlay -->
              <div class="cursors-overlay">
                <div
                  v-for="user in remoteCursors"
                  :key="user.id"
                  class="remote-cursor"
                  :style="getCursorStyle(user)"
                >
                  <div class="cursor-caret" :style="{ backgroundColor: user.color }"></div>
                  <div class="cursor-label" :style="{ backgroundColor: user.color }">
                    {{ user.username }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="wysiwyg-placeholder">
              WYSIWYG 編輯器 (Milkdown) - 開發中
            </div>
          </div>
        </div>
      </template>

      <template #right>
        <!-- Preview Panel -->
        <div class="panel preview-panel">
          <div class="panel-header">
            <!-- Left: Toggle Group -->
            <div class="toggle-group">
              <button
                class="btn btn-ghost"
                :class="{ active: previewMode === 'slides' }"
                @click="previewMode = 'slides'"
              >
                投影片預覽
              </button>
            </div>

            <!-- Right: Controls -->
            <div class="panel-controls">
              <router-link 
                :to="`/present/${workspace?.id}`" 
                class="btn btn-ghost play-btn"
                title="全螢幕播放"
              >
                ▶️ 播放
              </router-link>

              <div class="export-dropdown">
                <button class="btn btn-ghost" @click="showExportMenu = !showExportMenu" title="匯出">
                  📥 匯出
                </button>
                <div v-if="showExportMenu" class="dropdown-menu">
                  <button class="dropdown-item" @click="exportPPTX">匯出 PowerPoint</button>
                </div>
              </div>

              <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? '切換淺色模式' : '切換深色模式'">
                {{ theme === 'dark' ? '☀️' : '🌙' }}
              </button>
            </div>
          </div>
          <div class="panel-content slide-preview-container" @click="showExportMenu = false">
            <SlidePreview :content="content" @jumpToLine="jumpToLine" />
          </div>
        </div>
      </template>
    </SplitPane>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import SplitPane from './SplitPane.vue'
import SlidePreview from './SlidePreview.vue'
import { exportToPPTX } from '@/utils/pptx-export'

const route = useRoute()
const store = useWorkspaceStore()

const theme = ref<'dark' | 'light'>('dark')
const editorMode = ref<'text' | 'wysiwyg'>('text')
const previewMode = ref<'slides'>('slides')
const showExportMenu = ref(false)
const shareButtonText = ref('分享')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Local content for editing
const content = ref('')

// Computed from store
const workspace = computed(() => store.currentWorkspace)
const isConnected = computed(() => store.isConnected)
const otherUsers = computed(() => store.otherUsers)
const userCount = computed(() => store.userCount)

// Remote cursors (other users with cursor positions)
const remoteCursors = computed(() => {
  return store.otherUsers.filter(u => u.cursorPosition !== null)
})

onMounted(async () => {
  // Load theme
  const savedTheme = localStorage.getItem('sheltie-theme') as 'dark' | 'light' | null
  if (savedTheme) {
    theme.value = savedTheme
    document.documentElement.setAttribute('data-theme', savedTheme)
  }

  // Fetch workspace
  const workspaceId = route.params.id as string
  await store.fetchWorkspace(workspaceId)

  if (store.currentWorkspace) {
    content.value = store.currentWorkspace.content
    // Connect to WebSocket with a random username
    const randomName = `User ${Math.floor(Math.random() * 1000)}`
    store.connectWebSocket(workspaceId, randomName)
  }
})

onUnmounted(() => {
  store.disconnectWebSocket()
})

// Watch for external content changes (from other users)
watch(() => store.currentWorkspace?.content, (newContent) => {
  if (newContent && newContent !== content.value) {
    content.value = newContent
  }
})

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('sheltie-theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

let debounceTimer: number | null = null
const onContentChange = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    store.updateContent(content.value)
  }, 300)
}

// Track and broadcast cursor position
const onCursorChange = () => {
  if (textareaRef.value) {
    const { selectionStart, selectionEnd } = textareaRef.value
    store.sendCursor(selectionStart, selectionStart, selectionEnd)
  }
}

// Calculate cursor position style (approximate line/column to pixel)
const getCursorStyle = (user: { cursorPosition: number | null; color: string }) => {
  if (!textareaRef.value || user.cursorPosition === null) {
    return { display: 'none' }
  }

  const text = content.value.substring(0, user.cursorPosition)
  const lines = text.split('\n')
  const lineIndex = lines.length - 1
  const charIndex = lines[lineIndex].length

  // Approximate positioning (assumes monospace font)
  const lineHeight = 24 // Approximate line height
  const charWidth = 8.4 // Approximate character width for monospace

  const top = lineIndex * lineHeight + 16 // 16px padding
  const left = charIndex * charWidth + 16

  return {
    top: `${top}px`,
    left: `${left}px`
  }
}

// Jump to specific line in editor when clicking preview slide
const jumpToLine = (lineNumber: number) => {
  if (!textareaRef.value || lineNumber === undefined) return
  
  const lines = content.value.split('\n')
  let charPosition = 0
  
  // Calculate character position at start of target line
  for (let i = 0; i < lineNumber && i < lines.length; i++) {
    charPosition += lines[i].length + 1 // +1 for newline
  }
  
  // Focus textarea and set cursor position
  textareaRef.value.focus()
  textareaRef.value.setSelectionRange(charPosition, charPosition)
  
  // Scroll to the line
  const lineHeight = 24
  textareaRef.value.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight)
}

const copyShareUrl = async () => {
  if (!workspace.value) return
  const url = `${window.location.origin}/workspace/${workspace.value.id}`
  try {
    await navigator.clipboard.writeText(url)
    shareButtonText.value = '已複製!'
    setTimeout(() => {
      shareButtonText.value = '分享'
    }, 2000)
  } catch {
    alert('複製失敗，請手動複製')
  }
}

const exportPPTX = () => {
  showExportMenu.value = false
  if (content.value) {
    exportToPPTX(content.value, workspace.value?.name || 'Sheltie Export')
  }
}
</script>

<style scoped>
.workspace-view {
  height: 100vh;
  padding: var(--spacing-sm);
  overflow: hidden;
}

.panel {
  height: 100%;
}

.editor-panel,
.preview-panel {
  min-width: 320px;
}

.panel-header {
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

/* Brand Logo with gradient animation */
.brand-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 700;
  font-size: var(--font-size-lg);
  background: linear-gradient(135deg, var(--color-accent) 0%, #a78bfa 50%, #f472b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
  text-decoration: none;
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Connection indicator */
.connection-indicator {
  display: flex;
  align-items: center;
  margin-left: var(--spacing-xs);
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.connection-indicator.connected .indicator-dot {
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success-glow);
}

/* User avatars */
.user-avatars {
  display: flex;
  align-items: center;
  margin-left: var(--spacing-sm);
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  margin-left: -6px;
  border: 2px solid var(--color-bg-secondary);
  cursor: default;
  transition: transform var(--transition-fast);
}

.user-avatar:first-child {
  margin-left: 0;
}

.user-avatar:hover {
  transform: scale(1.1);
  z-index: 10;
}

.user-avatar.more {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 600;
}

.share-btn {
  gap: var(--spacing-xs);
}

.icon {
  font-size: var(--font-size-base);
}

/* Panel Controls */
.panel-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

/* Export Dropdown */
.export-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-xs);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs);
  z-index: 1000;
  min-width: 150px;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  text-align: left;
  background: transparent;
  border: none;
  padding: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--color-bg-hover);
}

/* Editor wrapper with cursor overlay */
.editor-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  height: 100%;
}

/* Remote cursors overlay */
.cursors-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.remote-cursor {
  position: absolute;
  pointer-events: none;
  z-index: 50;
}

.cursor-caret {
  width: 2px;
  height: 18px;
  animation: cursor-blink 1s ease-in-out infinite;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.cursor-label {
  position: absolute;
  top: -18px;
  left: 0;
  padding: 2px 6px;
  font-size: 10px;
  color: white;
  border-radius: 3px;
  white-space: nowrap;
  font-weight: 500;
}

.wysiwyg-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
}

.slide-preview-container {
  padding: var(--spacing-md);
  overflow: auto;
}
</style>
