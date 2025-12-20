<template>
  <div id="app" :data-theme="theme">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const theme = ref<'dark' | 'light'>('dark')

onMounted(() => {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('sheltie-theme') as 'dark' | 'light' | null
  if (savedTheme) {
    theme.value = savedTheme
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    theme.value = 'light'
  }
})

// Provide theme toggle globally
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('sheltie-theme', theme.value)
}

// Expose for child components
defineExpose({ theme, toggleTheme })
</script>
