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
    <div v-if="!overviewMode" class="slide-container" @click="nextSlide">
      <div v-if="slides.length === 0" class="empty-slides">
        <p>尚無投影片</p>
      </div>
      <template v-else>
        <!-- Summary Slide -->
        <div v-if="currentSlideData?.type === 'summary'" class="slide summary-slide" :style="{ zoom: fontScale }">
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
              <tr
                v-for="project in currentSlideData.projects"
                :key="project.name"
                class="summary-row"
                :class="{ clickable: findProjectSlide(project.name) !== -1 }"
                @click.stop="jumpToProject(project.name)"
              >
                <td><span class="status-icon">{{ getStatusIcon(project.status) }}</span></td>
                <td class="project-name-cell">{{ project.name }}</td>
                <td>{{ project.currentState }}</td>
                <td>{{ project.progress }}%</td>
                <td>{{ project.contact }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Project Detail Slide -->
        <div v-else-if="currentSlideData?.type === 'project'" class="slide project-slide" :style="{ zoom: fontScale }">
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
              <button
                v-if="findPrecedingSummary() !== -1"
                class="tag tag-home-btn"
                title="返回彙整頁 (Home)"
                @click.stop="goToSummary()"
              >⌂ 彙整</button>
            </div>
          </div>

          <div class="slide-body">
            <!-- Departments Section -->
            <div class="departments-container" :class="{ 'two-rows': shouldUseTwoRows(currentSlideData.project?.departments) }">
              <div class="dept-item dept-assignee">
                <span class="dept-label">承辦：</span>
                <span
                  class="dept-value"
                  @mouseenter="showTooltip(formatDepartments(currentSlideData.project?.departments.承辦), $event)"
                  @mouseleave="hideTooltip"
                >{{ formatDepartments(currentSlideData.project?.departments.承辦) || '-' }}</span>
              </div>
              <div class="dept-divider" v-if="!shouldUseTwoRows(currentSlideData.project?.departments)">│</div>
              <div class="dept-item dept-partners">
                <span class="dept-label">協辦：</span>
                <span
                  class="dept-value"
                  @mouseenter="showTooltip(formatDepartments(currentSlideData.project?.departments.協辦), $event)"
                  @mouseleave="hideTooltip"
                >
                  {{ truncateDepts(formatDepartments(currentSlideData.project?.departments.協辦) || '-') }}
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
                    :style="getPhaseStyle(currentSlideData.project.phases, i)"
                  >
                    <div class="phase-arrow" :style="getPhaseArrowStyle(phase.name, i, currentSlideData.project.phases.length)">
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

            <!-- Bottom Section: 2/3 Meetings + 1/3 Other Notes -->
            <div class="bottom-section">
              <!-- Left 2/3: 會辦狀況 -->
              <div class="meetings-column">
                <div class="section-label">會辦狀況</div>
                <div class="meetings-list">
                  <div
                    v-for="(meeting, i) in currentSlideData.project?.meetings.slice(0, 5)"
                    :key="i"
                    class="meeting-entry"
                    :class="{ old: meeting.isOld }"
                  >
                    <div class="meeting-date">{{ meeting.date }}</div>
                    <div class="meeting-lines">
                      <div
                        v-for="(line, j) in meeting.lines"
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

              <!-- Right 1/3: 其他補充事項 -->
              <div v-if="currentSlideData.project?.notes?.length" class="other-notes-column">
                <div class="section-label">其他補充事項</div>
                <ul>
                  <li 
                    v-for="(note, i) in currentSlideData.project?.notes.slice(0, 5)" 
                    :key="i"
                    :class="{ tracking: note.isTracking, planned: note.isPlanned }"
                  >
                    {{ note.text }}
                    <ul v-if="note.children?.length">
                      <li
                        v-for="(child, j) in note.children"
                        :key="j"
                        :class="{ tracking: child.isTracking, planned: child.isPlanned }"
                      >
                        {{ child.text }}
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Overview Mode -->
    <div v-if="overviewMode" class="overview-container">
      <div class="overview-grid" ref="overviewGridRef">
        <div
          v-for="(slide, i) in slides"
          :key="i"
          class="overview-thumb"
          :class="{ active: i === currentSlide }"
          @click.stop="selectSlide(i)"
        >
          <div class="thumb-number">{{ i + 1 }}</div>
          <div class="thumb-content">
            <template v-if="slide.type === 'summary'">
              <div class="thumb-title">📊 專案進展彙整</div>
              <div class="thumb-detail">{{ slide.projects?.length || 0 }} 個專案</div>
            </template>
            <template v-else-if="slide.type === 'project'">
              <div class="thumb-title">{{ getStatusIcon(slide.project?.status) }} {{ slide.project?.name }}</div>
              <div class="thumb-detail">{{ slide.project?.currentState }} · {{ slide.project?.progress }}%</div>
            </template>
          </div>
        </div>
      </div>
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

    <!-- Custom Tooltip -->
    <Transition name="hud-fade">
      <div
        v-if="tooltipText"
        class="custom-tooltip"
        :style="tooltipStyle"
      >{{ tooltipText }}</div>
    </Transition>

    <!-- Font Scale HUD -->
    <Transition name="hud-fade">
      <div v-if="showFontHud" class="font-scale-hud">
        {{ fontScaleDisplay }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { parseMarkdown, generateSlides, mergeColliePhases, type Slide } from '@/utils/parser'
import { parseText, normalizeDate } from '../../../border-collie/src/shared/parser'
import { exportToPPTX } from '@/utils/pptx-export'
import { apiUrl } from '@/utils/api'
import { getStatusIcon } from '@/utils/status'
import { 
  getPhaseStyle, 
  getPhaseArrowStyle, 
  formatPhaseDate,
  showTodayPin, 
  getTodayPinStyle 
} from '@/utils/timeline'

const route = useRoute()
const containerRef = ref<HTMLElement | null>(null)
const overviewGridRef = ref<HTMLElement | null>(null)

const workspaceId = computed(() => route.params.id as string)
const workspaceName = ref('Sheltie')
const content = ref('')
const collieContentRef = ref('')
const slides = ref<Slide[]>([])
const currentSlide = ref(0)
const isFullscreen = ref(false)
const toolbarHidden = ref(false)
const overviewMode = ref(false)
const fontScale = ref(1)
const showFontHud = ref(false)
let hudTimeout: number | null = null

const fontScaleDisplay = computed(() => Math.round(fontScale.value * 100) + '%')

// Custom tooltip
const tooltipText = ref('')
const tooltipStyle = ref<Record<string, string>>({})

const showTooltip = (text: string, e: MouseEvent) => {
  if (!text) return
  tooltipText.value = text
  const x = Math.min(e.clientX + 14, window.innerWidth - 340)
  const y = e.clientY - 14
  tooltipStyle.value = { left: x + 'px', top: y + 'px' }
}

const hideTooltip = () => { tooltipText.value = '' }

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
    const response = await fetch(apiUrl(`/api/workspaces/${workspaceId.value}`))
    if (response.ok) {
      const workspace = await response.json()
      workspaceName.value = workspace.name
      content.value = workspace.content
      collieContentRef.value = workspace.collieContent || ''
      
      const projects = parseMarkdown(workspace.content)
      const collieProjects = collieContentRef.value ? parseText(collieContentRef.value) : []
      slides.value = generateSlides(mergeColliePhases(projects, collieProjects, normalizeDate))
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

const getOverviewColumns = (): number => {
  const grid = overviewGridRef.value
  if (!grid) return 1
  return getComputedStyle(grid).gridTemplateColumns.split(' ').length
}

const handleKeydown = (e: KeyboardEvent) => {
  if (overviewMode.value) {
    const total = slides.value.length
    const cols = getOverviewColumns()
    let next = currentSlide.value
    switch (e.key) {
      case 'ArrowRight': next = Math.min(next + 1, total - 1); break
      case 'ArrowLeft': next = Math.max(next - 1, 0); break
      case 'ArrowDown': next = Math.min(next + cols, total - 1); break
      case 'ArrowUp': next = Math.max(next - cols, 0); break
      case 'Enter':
      case ' ':
        overviewMode.value = false
        e.preventDefault()
        return
      case 'z':
      case 'Z':
        overviewMode.value = false
        e.preventDefault()
        return
      case 'Escape':
        if (isFullscreen.value) document.exitFullscreen()
        window.history.back()
        return
      default: return
    }
    currentSlide.value = next
    e.preventDefault()
    nextTick(() => {
      overviewGridRef.value?.children[next]?.scrollIntoView({ block: 'nearest' })
    })
    return
  }

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
    case 'Home': {
      const summaryIdx = findPrecedingSummary()
      if (summaryIdx !== -1) {
        currentSlide.value = summaryIdx
        e.preventDefault()
      }
      break
    }
    case 'Escape':
      // Always go back to workspace, not just exit fullscreen
      if (isFullscreen.value) {
        document.exitFullscreen()
      }
      window.history.back()
      break
    case 'f':
    case 'F':
      toggleFullscreen()
      break
    case 'z':
    case 'Z':
      overviewMode.value = !overviewMode.value
      e.preventDefault()
      break
    case '+':
    case '=':
      adjustFontScale(0.05)
      e.preventDefault()
      break
    case '-':
    case '_':
      adjustFontScale(-0.05)
      e.preventDefault()
      break
    case '0':
      fontScale.value = 1
      triggerFontHud()
      e.preventDefault()
      break
  }
}

const adjustFontScale = (delta: number) => {
  fontScale.value = Math.round(Math.min(2.0, Math.max(0.5, fontScale.value + delta)) * 100) / 100
  triggerFontHud()
}

const triggerFontHud = () => {
  showFontHud.value = true
  if (hudTimeout) clearTimeout(hudTimeout)
  hudTimeout = window.setTimeout(() => { showFontHud.value = false }, 1500)
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

const selectSlide = (index: number) => {
  currentSlide.value = index
  overviewMode.value = false
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

// Find the slide index for a project by name (-1 if not found)
const findProjectSlide = (name: string): number => {
  return slides.value.findIndex(s => s.type === 'project' && s.project?.name === name)
}

// Jump from summary slide to a project's slide
const jumpToProject = (name: string) => {
  const idx = findProjectSlide(name)
  if (idx !== -1) {
    currentSlide.value = idx
  }
}

// Find the summary slide that contains the current project in its projects list (-1 if none)
const findPrecedingSummary = (): number => {
  if (currentSlideData.value?.type !== 'project') return -1
  const projectName = currentSlideData.value.project?.name
  if (!projectName) return -1
  return slides.value.findIndex(
    s => s.type === 'summary' && s.projects?.some(p => p.name === projectName)
  )
}

// Navigate to the preceding summary slide
const goToSummary = () => {
  const idx = findPrecedingSummary()
  if (idx !== -1) {
    currentSlide.value = idx
  }
}

const exportPPTX = () => {
  if (content.value) {
    exportToPPTX(content.value, workspaceName.value, collieContentRef.value)
  }
}

// Format departments array to comma-separated string
const formatDepartments = (departments: string[] | undefined): string => {
  if (!departments || departments.length === 0) return ''
  return departments.join(', ')
}

// Truncate department text to maxLen characters
const truncateDepts = (text: string, maxLen = 60): string => {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// Check if should use two rows layout
const shouldUseTwoRows = (departments: { 承辦: string[], 協辦: string[] } | undefined): boolean => {
  if (!departments) return false
  const totalCount = (departments.承辦?.length || 0) + (departments.協辦?.length || 0)
  return totalCount >= 12
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
  font-size: 2.48rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1e293b;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.38rem;
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

/* Summary row hover / click navigation */
.summary-row {
  transition: background 0.18s, box-shadow 0.18s;
}

.summary-row.clickable {
  cursor: pointer;
}

.summary-row.clickable:hover {
  background: #eff6ff;
  box-shadow: inset 4px 0 0 #3b82f6;
}

.summary-row.clickable:hover .project-name-cell {
  color: #1d4ed8;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

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
  font-size: 2.2rem;
}

.project-title {
  font-size: 2.48rem;
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
  font-size: 1.21rem;
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

.tag-home-btn {
  background: #f0fdf4;
  color: #166534;
  border: 1.5px solid #bbf7d0;
  padding: 0.35rem 1rem;
  border-radius: 1rem;
  font-size: 1.21rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, transform 0.15s;
  margin-left: 0.5rem;
}

.tag-home-btn:hover {
  background: #dcfce7;
  border-color: #4ade80;
  transform: translateY(-1px);
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
  font-size: 0.77rem;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
}

.info-value {
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 500;
}

/* Departments Container */
.departments-container {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  font-size: 1.32rem;
  padding-top: 0.25rem;
}

.departments-container.two-rows {
  flex-direction: column;
  gap: 0.35rem;
}

.dept-item {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  white-space: nowrap;
}

.two-rows .dept-item {
  width: 100%;
  white-space: normal;
}

.dept-assignee {
  flex-shrink: 0;
}

.dept-label {
  color: #64748b;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}

.two-rows .dept-label {
  width: 4rem;
}

.dept-value {
  color: #1e293b;
  line-height: 1.4;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.two-rows .dept-partners .dept-value {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.section-label {
  font-size: 1.38rem;
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
  height: 60px;
}

.gantt-phases {
  position: relative;
  height: 52px;
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
  font-size: 1.32rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%);
}

.gantt-phase:first-child .phase-arrow {
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%);
}

.phase-dates {
  font-size: 1.1rem;
  opacity: 0.9;
  font-weight: 400;
  white-space: nowrap;
}

/* Phase colors are now applied via inline styles for dynamic phase support */

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
  font-size: 15.4px;
}

/* Bottom Section - 2/3 + 1/3 Layout */
.bottom-section {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.meetings-column {
  flex: 2;
  min-width: 0;
  overflow: hidden;
}

.other-notes-column {
  flex: 1;
  min-width: 0;
  padding-left: 1rem;
  border-left: 2px solid #e5e7eb;
  overflow: hidden;
}

.other-notes-column ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style-type: disc;
}

.other-notes-column li ul {
  margin-top: 0.35rem;
}

.other-notes-column li {
  font-size: 1.38rem;
  color: #4b5563;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.other-notes-column li.tracking {
  color: #dc2626;
  font-weight: 700;
}

.other-notes-column li.planned {
  color: #2563eb;
  font-style: italic;
}

.meetings-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.meeting-entry {
  display: flex;
  gap: 0.75rem;
  font-size: 1.38rem;
}

.meeting-date {
  width: 6.5rem;
  flex-shrink: 0;
  color: #64748b;
  font-weight: 500;
  font-size: 0.99rem;
  margin-top: 0.15rem;
  white-space: nowrap;
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

/* Overview Mode */
.overview-container {
  flex: 1;
  overflow-y: auto;
  padding: 4rem 2rem 2rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  max-width: 1600px;
  margin: 0 auto;
}

.overview-thumb {
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid transparent;
  border-radius: 10px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.overview-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.overview-thumb.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.thumb-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
}

.overview-thumb.active .thumb-number {
  background: #3b82f6;
  color: white;
}

.thumb-content {
  min-width: 0;
}

.thumb-title {
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumb-detail {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

/* Button overrides */.btn-ghost {
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

/* Font Scale HUD */
.font-scale-hud {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.72);
  color: white;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 1rem 2.5rem;
  border-radius: 1rem;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  pointer-events: none;
  z-index: 999;
}

.hud-fade-enter-active,
.hud-fade-leave-active {
  transition: opacity 0.3s ease;
}

.hud-fade-enter-from,
.hud-fade-leave-to {
  opacity: 0;
}

/* Custom Tooltip (works in fullscreen, bypasses native title suppression) */
.custom-tooltip {
  position: fixed;
  max-width: 480px;
  background: rgba(15, 23, 42, 0.95);
  color: #f1f5f9;
  font-size: 1rem;
  line-height: 1.6;
  padding: 0.55rem 0.9rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  pointer-events: none;
  z-index: 9999;
  white-space: normal;
  word-break: break-all;
  transform: translateY(-100%);
}
</style>
