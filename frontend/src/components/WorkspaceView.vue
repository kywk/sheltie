<template>
  <div class="workspace-view" :data-theme="theme">
    <SplitPane :initial-ratio="0.4" :min-left="320" :min-right="400">

      <!-- ══════════════ 左側：編輯面板 ══════════════ -->
      <template #left>
        <div class="panel editor-panel">
          <!-- header：品牌 + 連線 + 頭像 + 編輯 tabs 一列 -->
          <div class="panel-header">
            <div class="header-left">
              <router-link to="/" class="brand-logo">
                🐕 {{ workspace?.name || 'Sheltie' }}
              </router-link>
              <span
                class="connection-indicator"
                :class="{ connected: isConnected }"
                :title="isConnected ? `已連線 (${userCount} 人在線)` : '離線'"
              >
                <span class="indicator-dot"></span>
              </span>
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
            <!-- 編輯 tabs -->
            <div class="header-tabs">
              <button class="htab" :class="{ active: leftTab === 'progress' }" @click="leftTab = 'progress'">
                📝 專案進度
              </button>
              <button class="htab" :class="{ active: leftTab === 'gantt-text' }" @click="leftTab = 'gantt-text'">
                ✏️ 人力配置
              </button>
              <button class="htab" :class="{ active: leftTab === 'gantt-table' }" @click="leftTab = 'gantt-table'">
                📋 人力表格
              </button>
            </div>
          </div>

          <!-- 左側內容 -->
          <div class="panel-content editor-container">

            <!-- 📝 專案進度 -->
            <div v-show="leftTab === 'progress'" class="editor-wrapper">
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

            <!-- ✏️ 人力配置 文字 (border-collie TextEditor) -->
            <div v-show="leftTab === 'gantt-text'" class="collie-editor-wrapper">
              <BCTextEditor v-model="collieContent" />
            </div>

            <!-- 📋 人力表格 (border-collie TableEditor) -->
            <div v-show="leftTab === 'gantt-table'" class="collie-editor-wrapper">
              <BCTableEditor
                :projects="ganttProjects"
                @update:projects="onTableUpdateProjects"
              />
            </div>

          </div>
        </div>
      </template>

      <!-- ══════════════ 右側：檢視面板 ══════════════ -->
      <template #right>
        <div class="panel preview-panel">
          <!-- header：view tabs + controls -->
          <div class="panel-header">
            <div class="header-tabs">
              <button class="htab" :class="{ active: rightTab === 'slides' }" @click="rightTab = 'slides'">
                💻 專案投影片
              </button>
              <button class="htab" :class="{ active: rightTab === 'gantt-project' }" @click="rightTab = 'gantt-project'">
                📊 專案甘特圖
              </button>
              <button class="htab" :class="{ active: rightTab === 'gantt-person' }" @click="rightTab = 'gantt-person'">
                👤 人力甘特圖
              </button>
            </div>
            <div class="panel-controls">
              <router-link
                v-if="rightTab === 'slides'"
                :to="`/present/${workspace?.id}`"
                class="btn btn-ghost"
              >▶️ 播放</router-link>

              <div v-if="rightTab === 'slides'" class="export-dropdown">
                <button class="btn btn-ghost" @click="showExportMenu = !showExportMenu">📥 匯出</button>
                <div v-if="showExportMenu" class="dropdown-menu">
                  <button class="dropdown-item" @click="exportPPTX">匯出 PowerPoint</button>
                </div>
              </div>

              <!-- 甘特圖工具列 -->
              <template v-if="rightTab !== 'slides'">
                <button class="btn btn-ghost btn-sm-icon" @click="zoomIn">🔍+</button>
                <button class="btn btn-ghost btn-sm-icon" @click="zoomOut">🔍-</button>
                <span class="zoom-label">{{ ganttScale.monthWidth }}px/月</span>
                <div class="toggle-group">
                  <button class="btn btn-ghost btn-sm-icon" :class="{ active: barStyle === 'block' }" @click="barStyle = 'block'">▬</button>
                  <button class="btn btn-ghost btn-sm-icon" :class="{ active: barStyle === 'arrow' }" @click="barStyle = 'arrow'">➤</button>
                </div>
              </template>

              <button class="theme-toggle" @click="toggleTheme">
                {{ theme === 'dark' ? '☀️' : '🌙' }}
              </button>
            </div>
          </div>

          <!-- 右側內容 -->
          <div
            class="panel-content"
            :class="rightTab === 'slides' ? 'slide-preview-container' : 'gantt-view-container'"
            @click="showExportMenu = false"
          >
            <SlidePreview v-if="rightTab === 'slides'" :content="content" @jumpToLine="jumpToLine" />

            <div v-else-if="rightTab === 'gantt-project'" class="gantt-scroll">
              <ProjectGantt
                :computed-phases="computedPhases"
                :projects="ganttProjects"
                :scale="ganttScale"
                :bar-style="barStyle"
                :time-range="ganttTimeRange"
              />
            </div>

            <div v-else-if="rightTab === 'gantt-person'" class="gantt-scroll">
              <PersonGantt
                :person-assignments="personAssignments"
                :all-persons="allPersons"
                :scale="ganttScale"
                :bar-style="barStyle"
                :time-range="ganttTimeRange"
              />
            </div>
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
import ProjectGantt from '../../../border-collie/src/components/ProjectGantt.vue'
import PersonGantt from '../../../border-collie/src/components/PersonGantt.vue'
import BCTextEditor from '../../../border-collie/src/components/TextEditor.vue'
import BCTableEditor from '../../../border-collie/src/components/TableEditor.vue'
import { parseText, serializeToText } from '../../../border-collie/src/shared/parser'
import { useGanttData } from '../../../border-collie/src/shared/composables/useGanttData'
import type {
  Project, GanttScale
} from '../../../border-collie/src/shared/types'
import { exportToPPTX } from '@/utils/pptx-export'

const route = useRoute()
const store = useWorkspaceStore()

// ── UI State ──
const theme = ref<'dark' | 'light'>('dark')
const leftTab  = ref<'progress' | 'gantt-text' | 'gantt-table'>('progress')
const rightTab = ref<'slides' | 'gantt-project' | 'gantt-person'>('slides')
const showExportMenu = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// ── Content ──
const content = ref('')
const collieContent = ref('')

// ── Gantt UI State ──
const barStyle = ref<'block' | 'arrow'>('block')
const ganttScale = ref<GanttScale>({ monthWidth: 80, rowHeight: 40 })

// ── Store Computed ──
const workspace   = computed(() => store.currentWorkspace)
const isConnected = computed(() => store.isConnected)
const otherUsers  = computed(() => store.otherUsers)
const userCount   = computed(() => store.userCount)
const remoteCursors = computed(() => store.otherUsers.filter(u => u.cursorPosition !== null))

// ── Gantt Computation (via border-collie shared composable) ──
const ganttProjects = computed<Project[]>(() => {
  try { return parseText(collieContent.value) }
  catch { return [] }
})

const { computedPhases, personAssignments, allPersons, timeRange: ganttTimeRange } = useGanttData(ganttProjects)

// ── Zoom ──
const zoomIn  = () => ganttScale.value = { ...ganttScale.value, monthWidth: Math.min(200, ganttScale.value.monthWidth + 20) }
const zoomOut = () => ganttScale.value = { ...ganttScale.value, monthWidth: Math.max(40, ganttScale.value.monthWidth - 20) }

// ── Table callback ──
function onTableUpdateProjects(updated: Project[]) {
  collieContent.value = serializeToText(updated)
}

// ── Lifecycle & Sync ──
onMounted(async () => {
  const savedTheme = localStorage.getItem('sheltie-theme') as 'dark' | 'light' | null
  if (savedTheme) {
    theme.value = savedTheme
    document.documentElement.setAttribute('data-theme', savedTheme)
  }
  const workspaceId = route.params.id as string
  await store.fetchWorkspace(workspaceId)
  if (store.currentWorkspace) {
    content.value = store.currentWorkspace.content
    collieContent.value = store.currentWorkspace.collieContent || ''
    store.connectWebSocket(workspaceId, `User ${Math.floor(Math.random() * 1000)}`)
  }
})

onUnmounted(() => store.disconnectWebSocket())

watch(() => store.currentWorkspace?.content, (v) => { if (v && v !== content.value) content.value = v })
watch(() => store.currentWorkspace?.collieContent, (v) => { if (v !== undefined && v !== collieContent.value) collieContent.value = v })

// Auto-save collieContent
let collieSaveTimer: number | null = null
watch(collieContent, (newVal) => {
  if (!store.currentWorkspace || newVal === store.currentWorkspace.collieContent) return
  if (collieSaveTimer) clearTimeout(collieSaveTimer)
  collieSaveTimer = window.setTimeout(async () => {
    if (!store.currentWorkspace) return
    try {
      await fetch(`/api/workspaces/${store.currentWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collieContent: newVal })
      })
    } catch (e) { console.error('Failed to save collie content:', e) }
  }, 500)
})

// ── Editor helpers ──
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('sheltie-theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

let debounceTimer: number | null = null
const onContentChange = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => store.updateContent(content.value), 300)
}

const onCursorChange = () => {
  if (textareaRef.value) {
    const { selectionStart, selectionEnd } = textareaRef.value
    store.sendCursor(selectionStart, selectionStart, selectionEnd)
  }
}

const getCursorStyle = (user: { cursorPosition: number | null; color: string }) => {
  if (!textareaRef.value || user.cursorPosition === null) return { display: 'none' }
  const text = content.value.substring(0, user.cursorPosition)
  const lines = text.split('\n')
  return { top: `${(lines.length - 1) * 24 + 16}px`, left: `${lines[lines.length - 1].length * 8.4 + 16}px` }
}

const jumpToLine = (lineNumber: number) => {
  if (!textareaRef.value) return
  const lines = content.value.split('\n')
  let pos = 0
  for (let i = 0; i < lineNumber && i < lines.length; i++) pos += lines[i].length + 1
  textareaRef.value.focus()
  textareaRef.value.setSelectionRange(pos, pos)
  textareaRef.value.scrollTop = Math.max(0, (lineNumber - 3) * 24)
}

const exportPPTX = () => {
  showExportMenu.value = false
  if (content.value) exportToPPTX(content.value, workspace.value?.name || 'Sheltie')
}
</script>

<style scoped>
.workspace-view {
  height: 100vh;
  padding: var(--spacing-sm);
  overflow: hidden;
}

.panel { height: 100%; }
.editor-panel, .preview-panel { min-width: 320px; }

/* ── Header ── */
.panel-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: nowrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.header-left::after {
  content: '';
  display: block;
  width: 1px;
  height: 18px;
  background: var(--color-border);
  margin-left: var(--spacing-xs);
}

.header-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

/* ── htab ── */
.htab {
  padding: 4px 10px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.htab:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.htab.active { background: var(--color-accent); color: white; }

/* ── Brand ── */
.brand-logo {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: var(--font-size-lg);
  background: linear-gradient(135deg, var(--color-accent) 0%, #a78bfa 50%, #f472b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
  text-decoration: none;
  white-space: nowrap;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ── Connection ── */
.connection-indicator { display: flex; align-items: center; }

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

/* ── User avatars ── */
.user-avatars { display: flex; align-items: center; }

.user-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  margin-left: -5px;
  border: 2px solid var(--color-bg-secondary);
  cursor: default;
  transition: transform var(--transition-fast);
}

.user-avatar:first-child { margin-left: 0; }
.user-avatar:hover { transform: scale(1.1); z-index: 10; }

.user-avatar.more {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 600;
}

/* ── Panel controls ── */
.panel-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
  margin-left: auto;
}

.zoom-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  min-width: 55px;
}

.btn-sm-icon {
  padding: 2px 6px !important;
  font-size: var(--font-size-xs) !important;
}

/* ── Editor containers ── */
.editor-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  height: 100%;
}

/* border-collie editor wrapper — fill the panel-content */
.collie-editor-wrapper {
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Remote cursors */
.cursors-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.remote-cursor { position: absolute; pointer-events: none; z-index: 50; }

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

/* ── Right panel ── */
.gantt-view-container { overflow: hidden; }
.gantt-scroll { height: 100%; overflow: auto; }

.export-dropdown { position: relative; }

.dropdown-menu {
  position: absolute;
  top: 100%; right: 0;
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
  background: transparent; border: none;
  padding: var(--spacing-sm); font-size: var(--font-size-sm);
  color: var(--color-text-primary); cursor: pointer;
  border-radius: var(--radius-sm); transition: background var(--transition-fast);
}
.dropdown-item:hover { background: var(--color-bg-hover); }

.slide-preview-container { padding: var(--spacing-md); overflow: auto; }
</style>
