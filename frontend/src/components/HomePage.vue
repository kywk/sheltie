<template>
  <div class="home-page">
    <nav class="navbar">
      <router-link to="/" class="brand-logo">
        🐕 Sheltie
      </router-link>
      <div class="navbar-actions">
        <router-link to="/admin" class="btn btn-ghost">
          ⚙️ 管理
        </router-link>
        <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? '切換淺色' : '切換深色'">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </nav>

    <main class="home-content">
      <div class="hero-section">
        <h1 class="hero-title">專案進展協作工具</h1>
        <p class="hero-subtitle">Markdown 線上協同編輯，自動轉換投影片，匯出 PPTX</p>
      </div>

      <div v-if="isLoading" class="loading-state">
        載入中...
      </div>

      <div v-else-if="workspaces.length === 0" class="empty-state">
        <p>尚無工作區</p>
        <p class="text-muted">請從管理介面新增工作區</p>
      </div>

      <div v-else class="card-grid">
        <div
          v-for="ws in workspaces"
          :key="ws.id"
          class="workspace-card"
          @click="openWorkspace(ws.id)"
        >
          <div class="workspace-card-title">{{ ws.name }}</div>
          <div class="workspace-card-desc">{{ ws.description || '無描述' }}</div>
          <div class="workspace-card-meta">
            最後更新: {{ formatDate(ws.updatedAt) }}
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { WorkspaceListItem } from '@/stores/workspace'

const router = useRouter()
const workspaces = ref<WorkspaceListItem[]>([])
const isLoading = ref(true)

// Theme from parent
const theme = ref<'dark' | 'light'>('dark')

onMounted(async () => {
  // Load theme
  const savedTheme = localStorage.getItem('sheltie-theme') as 'dark' | 'light' | null
  if (savedTheme) theme.value = savedTheme

  // Fetch workspaces (public list from admin endpoint - simplified for demo)
  try {
    const token = localStorage.getItem('sheltie-admin-token')
    if (token) {
      const response = await fetch('/api/admin/workspaces', {
        headers: { 'Authorization': token }
      })
      if (response.ok) {
        workspaces.value = await response.json()
      }
    }
  } catch (e) {
    console.error('Failed to fetch workspaces:', e)
  } finally {
    isLoading.value = false
  }
})

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('sheltie-theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

const openWorkspace = (id: string) => {
  router.push(`/workspace/${id}`)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.home-content {
  flex: 1;
  overflow: auto;
  padding: var(--spacing-xl);
}

.hero-section {
  text-align: center;
  padding: var(--spacing-2xl) 0;
}

.hero-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, var(--color-accent) 0%, #a78bfa 50%, #f472b6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
}
</style>
