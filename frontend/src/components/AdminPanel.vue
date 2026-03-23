<template>
  <div class="admin-panel" :data-theme="theme">
    <nav class="navbar">
      <router-link to="/" class="brand-logo">
        🐕 Sheltie
      </router-link>
      <div class="navbar-actions">
        <span class="text-muted" v-if="isAuthenticated">管理員模式</span>
        <button v-if="isAuthenticated" class="btn btn-ghost" @click="logout">
          登出
        </button>
        <button class="theme-toggle" @click="toggleTheme">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </nav>

    <!-- Login Form -->
    <div v-if="!isAuthenticated" class="login-container">
      <div class="modal-content">
        <h3 class="modal-title">🔐 管理員登入</h3>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label">密碼</label>
            <input
              type="password"
              class="form-input"
              v-model="password"
              placeholder="輸入管理員密碼"
              autofocus
            />
          </div>
          <div v-if="loginError" class="error-message">
            {{ loginError }}
          </div>
          <div class="modal-actions">
            <router-link to="/" class="btn btn-secondary">返回首頁</router-link>
            <button type="submit" class="btn btn-primary" :disabled="isLoggingIn">
              {{ isLoggingIn ? '登入中...' : '登入' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Admin Dashboard -->
    <div v-else class="admin-content">
      <div class="admin-header">
        <h1>工作區管理</h1>
        <button class="btn btn-primary" @click="showCreateDialog = true">
          ➕ 新增工作區
        </button>
      </div>

      <div v-if="isLoadingWorkspaces" class="loading-state">
        載入中...
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>名稱</th>
            <th>描述</th>
            <th>最後更新</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ws in workspaces" :key="ws.id">
            <td>
              <router-link :to="`/workspace/${ws.id}`" class="workspace-link">
                {{ ws.name }}
              </router-link>
            </td>
            <td>{{ ws.description || '-' }}</td>
            <td>{{ formatDate(ws.updatedAt) }}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-ghost btn-icon" @click="editWorkspace(ws)" title="編輯">
                  ✏️
                </button>
                <button class="btn btn-ghost btn-icon" @click="copyLink(ws.id)" title="複製連結">
                  🔗
                </button>
                <button class="btn btn-ghost btn-icon" @click="confirmDelete(ws)" title="刪除">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showCreateDialog || showEditDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content">
        <h3 class="modal-title">{{ showEditDialog ? '✏️ 編輯工作區' : '➕ 新增工作區' }}</h3>
        <form @submit.prevent="showEditDialog ? handleUpdate() : handleCreate()">
          <div class="form-group">
            <label class="form-label">名稱 *</label>
            <input
              type="text"
              class="form-input"
              v-model="formData.name"
              placeholder="輸入工作區名稱"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <input
              type="text"
              class="form-input"
              v-model="formData.description"
              placeholder="輸入描述（選填）"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeDialogs">取消</button>
            <button type="submit" class="btn btn-primary">
              {{ showEditDialog ? '更新' : '建立' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="showDeleteDialog = false">
      <div class="modal-content">
        <h3 class="modal-title">⚠️ 確認刪除</h3>
        <p>確定要刪除工作區「{{ workspaceToDelete?.name }}」嗎？此操作無法復原。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteDialog = false">取消</button>
          <button class="btn btn-danger" @click="handleDelete">刪除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import type { WorkspaceListItem } from '@/stores/workspace'
import { apiUrl } from '@/utils/api'

const adminStore = useAdminStore()

const theme = ref<'dark' | 'light'>('dark')
const password = ref('')
const loginError = ref('')
const isLoggingIn = ref(false)

const workspaces = ref<WorkspaceListItem[]>([])
const isLoadingWorkspaces = ref(false)

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const workspaceToDelete = ref<WorkspaceListItem | null>(null)

const formData = ref({
  id: '',
  name: '',
  description: ''
})

const isAuthenticated = computed(() => adminStore.isAuthenticated)

onMounted(() => {
  const savedTheme = localStorage.getItem('sheltie-theme') as 'dark' | 'light' | null
  if (savedTheme) {
    theme.value = savedTheme
    document.documentElement.setAttribute('data-theme', savedTheme)
  }

  if (isAuthenticated.value) {
    loadWorkspaces()
  }
})

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('sheltie-theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

const handleLogin = async () => {
  isLoggingIn.value = true
  loginError.value = ''
  
  const success = await adminStore.login(password.value)
  
  if (success) {
    password.value = ''
    await loadWorkspaces()
  } else {
    loginError.value = '密碼錯誤'
  }
  
  isLoggingIn.value = false
}

const logout = () => {
  adminStore.logout()
  workspaces.value = []
}

const loadWorkspaces = async () => {
  isLoadingWorkspaces.value = true
  try {
    const response = await fetch(apiUrl('/api/admin/workspaces'), {
      headers: adminStore.getAuthHeaders()
    })
    if (response.ok) {
      workspaces.value = await response.json() || []
    }
  } catch (e) {
    console.error('Failed to load workspaces:', e)
  } finally {
    isLoadingWorkspaces.value = false
  }
}

const handleCreate = async () => {
  try {
    const response = await fetch(apiUrl('/api/admin/workspaces'), {
      method: 'POST',
      headers: adminStore.getAuthHeaders(),
      body: JSON.stringify({
        name: formData.value.name,
        description: formData.value.description
      })
    })
    if (response.ok) {
      await loadWorkspaces()
      closeDialogs()
    }
  } catch (e) {
    console.error('Failed to create workspace:', e)
  }
}

const editWorkspace = (ws: WorkspaceListItem) => {
  formData.value = {
    id: ws.id,
    name: ws.name,
    description: ws.description
  }
  showEditDialog.value = true
}

const handleUpdate = async () => {
  try {
    const response = await fetch(apiUrl(`/api/admin/workspaces/${formData.value.id}`), {
      method: 'PUT',
      headers: adminStore.getAuthHeaders(),
      body: JSON.stringify({
        name: formData.value.name,
        description: formData.value.description
      })
    })
    if (response.ok) {
      await loadWorkspaces()
      closeDialogs()
    }
  } catch (e) {
    console.error('Failed to update workspace:', e)
  }
}

const confirmDelete = (ws: WorkspaceListItem) => {
  workspaceToDelete.value = ws
  showDeleteDialog.value = true
}

const handleDelete = async () => {
  if (!workspaceToDelete.value) return
  try {
    const response = await fetch(apiUrl(`/api/admin/workspaces/${workspaceToDelete.value.id}`), {
      method: 'DELETE',
      headers: adminStore.getAuthHeaders()
    })
    if (response.ok) {
      await loadWorkspaces()
    }
  } catch (e) {
    console.error('Failed to delete workspace:', e)
  }
  showDeleteDialog.value = false
  workspaceToDelete.value = null
}

const closeDialogs = () => {
  showCreateDialog.value = false
  showEditDialog.value = false
  formData.value = { id: '', name: '', description: '' }
}

const copyLink = async (id: string) => {
  const url = `${window.location.origin}/workspace/${id}`
  try {
    await navigator.clipboard.writeText(url)
    alert('已複製連結！')
  } catch {
    alert('複製失敗')
  }
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
.admin-panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.login-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-content {
  flex: 1;
  padding: var(--spacing-xl);
  overflow: auto;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.admin-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
}

.workspace-link {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}

.workspace-link:hover {
  text-decoration: underline;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.error-message {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}

.loading-state {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
}
</style>
