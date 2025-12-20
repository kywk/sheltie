<template>
  <div class="presentation-view" @keydown="handleKeydown" tabindex="0" ref="containerRef">
    <!-- Toolbar -->
    <div class="presentation-toolbar" :class="{ hidden: toolbarHidden }">
      <div class="toolbar-left">
        <router-link :to="`/workspace/${workspaceId}`" class="btn btn-ghost back-btn">
          ← 返回編輯
        </router-link>
        <span class="slide-counter">{{ currentSlide + 1 }} / {{ slides.length }}</span>
      </div>
      <div class="toolbar-center">
        <h1 class="presentation-title">{{ workspaceName }}</h1>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-ghost" @click="toggleFullscreen" :title="isFullscreen ? '退出全螢幕' : '全螢幕'">
          {{ isFullscreen ? '⛶' : '⛶' }}
        </button>
        <button class="btn btn-ghost" @click="exportPPTX" title="匯出 PowerPoint">
          📥
        </button>
      </div>
    </div>

    <!-- Slide Content -->
    <div class="slide-container" @click="nextSlide">
      <div v-if="slides.length === 0" class="empty-slides">
        <p>尚無投影片</p>
      </div>
      <template v-else>
        <!-- Summary Slide -->
        <div v-if="currentSlideData?.type === 'summary'" class="slide summary-slide">
          <div class="slide-title">專案進展彙整 {{ getSummaryIndex() }}</div>
          <table class="summary-table">
            <thead>
              <tr>
                <th class="col-status">燈號</th>
                <th class="col-name">專案名稱</th>
                <th class="col-state">狀態</th>
                <th class="col-progress">進度</th>
                <th class="col-contact">窗口</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="project in currentSlideData.projects" :key="project.name">
                <td><span class="status-icon">{{ getStatusIcon(project.status) }}</span></td>
                <td>{{ project.name }}</td>
                <td>{{ project.currentState }}</td>
                <td>{{ project.progress }}%</td>
                <td>{{ project.contact }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Project Detail Slide -->
        <div v-else-if="currentSlideData?.type === 'project'" class="slide project-slide">
          <!-- Header with Tags -->
          <div class="slide-header">
            <div class="header-main">
              <span class="status-icon large">{{ getStatusIcon(currentSlideData.project?.status) }}</span>
              <h2 class="project-title">{{ currentSlideData.project?.name }}</h2>
            </div>
            <div class="header-tags">
              <span class="tag tag-state">{{ currentSlideData.project?.currentState || '-' }}</span>
              <span class="tag tag-progress">{{ currentSlideData.project?.progress }}%</span>
              <span class="tag tag-contact" v-if="currentSlideData.project?.contact">{{ currentSlideData.project?.contact }}</span>
              <span class="tag tag-category" v-if="currentSlideData.project?.category">{{ currentSlideData.project?.category }}</span>
            </div>
          </div>

          <div class="slide-body">
            <!-- Departments Row -->
            <div class="departments-row">
              <div class="dept-item">
                <span class="dept-label">主辦：</span>
                <span class="dept-value">{{ currentSlideData.project?.departments.主辦 || '-' }}</span>
              </div>
              <div class="dept-divider">│</div>
              <div class="dept-item dept-partners">
                <span class="dept-label">協辦：</span>
                <span class="dept-value" :title="currentSlideData.project?.departments.協辦">
                  {{ currentSlideData.project?.departments.協辦 || '-' }}
                </span>
              </div>
            </div>

            <!-- Timeline Gantt -->
            <div v-if="currentSlideData.project?.phases.length" class="timeline-section">
              <div class="section-label">時程</div>
              <div class="timeline-gantt">
                <div class="gantt-phases">
                  <div
                    v-for="(phase, i) in currentSlideData.project.phases"
                    :key="phase.name"
                    class="gantt-phase"
                    :class="getPhaseClass(phase.name)"
                    :style="getPhaseStyle(currentSlideData.project.phases, i)"
                  >
                    <div class="phase-arrow">
                      <span class="phase-name">{{ phase.name }}</span>
                      <span class="phase-dates">{{ formatPhaseDate(phase) }}</span>
                    </div>
                  </div>
                </div>
                <div
                  v-if="showTodayPin(currentSlideData.project.phases)"
                  class="today-pin"
                  :style="getTodayPinStyle(currentSlideData.project.phases)"
                >
                  <div class="today-line"></div>
                  <div class="today-marker">📍</div>
                </div>
              </div>
            </div>

            <!-- Meeting Notes -->
            <div class="meetings-section">
              <div class="section-label">會辦狀況</div>
              <div class="meetings-list">
                <div
                  v-for="(meeting, i) in currentSlideData.project?.meetings.slice(0, 4)"
                  :key="i"
                  class="meeting-entry"
                  :class="{ old: meeting.isOld }"
                >
                  <div class="meeting-date">{{ meeting.date }}</div>
                  <div class="meeting-lines">
                    <div
                      v-for="(line, j) in meeting.lines.slice(0, 3)"
                      :key="j"
                      class="meeting-line"
                      :class="{ tracking: line.isTracking, planned: line.isPlanned }"
                    >
                      {{ line.text }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Navigation -->
    <div class="slide-nav">
      <button class="nav-btn prev" @click.stop="prevSlide" :disabled="currentSlide === 0">
        ‹
      </button>
      <button class="nav-btn next" @click.stop="nextSlide" :disabled="currentSlide >= slides.length - 1">
        ›
      </button>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { parseMarkdown, generateSlides, getTodayString, type Slide, type Phase } from '@/utils/parser'
import { exportToPPTX } from '@/utils/pptx-export'

const route = useRoute()
const containerRef = ref<HTMLElement | null>(null)

const workspaceId = computed(() => route.params.id as string)
const workspaceName = ref('Sheltie')
const content = ref('')
const slides = ref<Slide[]>([])
const currentSlide = ref(0)
const isFullscreen = ref(false)
const toolbarHidden = ref(false)

// Auto-hide toolbar
let toolbarTimeout: number | null = null

const currentSlideData = computed(() => slides.value[currentSlide.value])

const progressPercent = computed(() => {
  if (slides.value.length === 0) return 0
  return ((currentSlide.value + 1) / slides.value.length) * 100
})

onMounted(async () => {
  // Fetch workspace content
  try {
    const response = await fetch(`/api/workspaces/${workspaceId.value}`)
    if (response.ok) {
      const workspace = await response.json()
      workspaceName.value = workspace.name
      content.value = workspace.content
      
      const projects = parseMarkdown(workspace.content)
      slides.value = generateSlides(projects)
    }
  } catch (e) {
    console.error('Failed to fetch workspace:', e)
  }

  // Focus for keyboard events
  containerRef.value?.focus()

  // Fullscreen change listener
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  
  // Mouse move to show toolbar
  document.addEventListener('mousemove', showToolbar)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('mousemove', showToolbar)
  if (toolbarTimeout) clearTimeout(toolbarTimeout)
})

const showToolbar = () => {
  toolbarHidden.value = false
  if (toolbarTimeout) clearTimeout(toolbarTimeout)
  toolbarTimeout = window.setTimeout(() => {
    if (isFullscreen.value) {
      toolbarHidden.value = true
    }
  }, 3000)
}

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case ' ':
    case 'Enter':
      nextSlide()
      e.preventDefault()
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      prevSlide()
      e.preventDefault()
      break
    case 'Escape':
      if (isFullscreen.value) {
        document.exitFullscreen()
      }
      break
    case 'f':
    case 'F':
      toggleFullscreen()
      break
  }
}

const nextSlide = () => {
  if (currentSlide.value < slides.value.length - 1) {
    currentSlide.value++
  }
}

const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.value?.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

const getSummaryIndex = () => {
  let count = 0
  for (let i = 0; i <= currentSlide.value; i++) {
    if (slides.value[i]?.type === 'summary') count++
  }
  return count
}

const getStatusIcon = (status?: string) => {
  if (!status) return '●'
  if (status === '紅' || status.includes('紅')) return '🔴'
  if (status === '黃' || status.includes('黃')) return '🟡'
  return '🟢'
}

const getPhaseClass = (phaseName: string) => {
  const classes: Record<string, string> = {
    '開發': 'phase-dev',
    'SIT': 'phase-sit',
    'QAS': 'phase-qas',
    'REG': 'phase-reg',
    'PROD': 'phase-prod'
  }
  return classes[phaseName] || ''
}

const getPhaseStyle = (phases: Phase[], index: number) => {
  const totalPhases = phases.length
  const width = 100 / totalPhases
  const left = index * width
  const overlap = index > 0 ? 8 : 0
  
  return {
    left: `calc(${left}% - ${overlap}px)`,
    width: `calc(${width}% + ${overlap}px)`,
    zIndex: totalPhases - index
  }
}

const formatPhaseDate = (phase: Phase) => {
  if (!phase.startDate) return ''
  const start = phase.startDate.slice(5)
  const end = phase.endDate ? phase.endDate.slice(5) : ''
  return end && end !== start ? `${start}~${end}` : start
}

const showTodayPin = (phases: Phase[]) => {
  if (!phases.length) return false
  const today = getTodayString()
  const firstStart = phases[0]?.startDate
  const lastEnd = phases[phases.length - 1]?.endDate || phases[phases.length - 1]?.startDate
  return today >= firstStart && today <= lastEnd
}

const getTodayPinStyle = (phases: Phase[]) => {
  const today = getTodayString()
  const firstStart = phases[0]?.startDate
  const lastEnd = phases[phases.length - 1]?.endDate || phases[phases.length - 1]?.startDate
  
  const start = new Date(firstStart).getTime()
  const end = new Date(lastEnd).getTime()
  const now = new Date(today).getTime()
  
  if (end === start) return { left: '0%' }
  const position = ((now - start) / (end - start)) * 100
  return { left: `${Math.min(100, Math.max(0, position))}%` }
}

const exportPPTX = () => {
  if (content.value) {
    exportToPPTX(content.value, workspaceName.value)
  }
}
</script>

<style scoped>
.presentation-view {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  outline: none;
}

/* Toolbar */
.presentation-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  z-index: 100;
  transition: opacity 0.3s, transform 0.3s;
}

.presentation-toolbar.hidden {
  opacity: 0;
  transform: translateY(-100%);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toolbar-center {
  flex: 1;
  text-align: center;
}

.presentation-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.back-btn {
  color: white;
}

.slide-counter {
  color: rgba(255,255,255,0.7);
  font-size: 0.875rem;
}

/* Slide Container - Maximized slide area */
.slide-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem 1rem;
  cursor: pointer;
}

.slide {
  width: 100%;
  max-width: 1600px;
  height: calc(100% - 1rem);
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  padding: 1.75rem 2.5rem;
  color: #1a1a1a;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Summary Slide */
.summary-slide .slide-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1e293b;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.25rem;
}

.summary-table th,
.summary-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.summary-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
}

.col-status { width: 80px; text-align: center; }
.col-name { width: 30%; }
.col-progress { width: 100px; text-align: center; }

/* Project Slide Header */
.project-slide .slide-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-icon.large {
  font-size: 2rem;
}

.project-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

/* Tags */
.header-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0.35rem 1rem;
  border-radius: 1rem;
  font-size: 1.1rem;
  font-weight: 500;
}

.tag-state {
  background: #dbeafe;
  color: #1e40af;
}

.tag-progress {
  background: #dcfce7;
  color: #166534;
}

.tag-contact {
  background: #fef3c7;
  color: #92400e;
}

.tag-category {
  background: #f3e8ff;
  color: #7c3aed;
}

.slide-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: 0.375rem;
}

.info-label {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
}

.info-value {
  font-size: 1rem;
  color: #1e293b;
  font-weight: 500;
}

/* Departments Row */
.departments-row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  font-size: 1.2rem;
  padding-top: 0.25rem;
}

.dept-item {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.dept-label {
  color: #64748b;
  font-weight: 500;
  flex-shrink: 0;
}

.dept-value {
  color: #1e293b;
}

.dept-divider {
  color: #d1d5db;
  flex-shrink: 0;
}

/* Partner departments - expandable */
.dept-partners {
  flex: 1;
  min-width: 0;
}

.dept-partners .dept-value {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.section-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.4rem;
}

/* Timeline */
.timeline-section {
  padding: 0.5rem 0;
}

.timeline-gantt {
  position: relative;
  height: 48px;
}

.gantt-phases {
  position: relative;
  height: 40px;
}

.gantt-phase {
  position: absolute;
  height: 100%;
}

.phase-arrow {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%);
}

.gantt-phase:first-child .phase-arrow {
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%);
}

.phase-dates {
  font-size: 0.8rem;
  opacity: 0.9;
  font-weight: 400;
}

.phase-dev .phase-arrow { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
.phase-sit .phase-arrow { background: linear-gradient(135deg, #34d399, #10b981); }
.phase-qas .phase-arrow { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.phase-reg .phase-arrow { background: linear-gradient(135deg, #f472b6, #ec4899); }
.phase-prod .phase-arrow { background: linear-gradient(135deg, #a78bfa, #8b5cf6); }

.today-pin {
  position: absolute;
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 100;
}

.today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
}

.today-marker {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
}

/* Meetings */
.meetings-section {
  flex: 1;
  overflow: hidden;
}

.meetings-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.meeting-entry {
  display: flex;
  gap: 1rem;
  font-size: 1.15rem;
}

.meeting-date {
  width: 110px;
  flex-shrink: 0;
  color: #64748b;
  font-weight: 500;
}

.meeting-lines {
  flex: 1;
}

.meeting-line {
  color: #374151;
}

.meeting-line.tracking {
  color: #dc2626;
  font-weight: 700;
}

.meeting-line.planned {
  color: #2563eb;
  font-style: italic;
}

.meeting-entry.old .meeting-date,
.meeting-entry.old .meeting-line {
  color: #9ca3af;
}

/* Navigation */
.slide-nav {
  position: absolute;
  bottom: 50%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 1rem;
  pointer-events: none;
}

.nav-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.2);
  transform: scale(1.1);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Progress Bar */
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255,255,255,0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

.empty-slides {
  color: rgba(255,255,255,0.5);
  text-align: center;
}

/* Button overrides */
.btn-ghost {
  color: white;
  background: transparent;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 0.5rem;
}

.btn-ghost:hover {
  background: rgba(255,255,255,0.1);
}
</style>
