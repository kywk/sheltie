<template>
  <div class="slides-container">
    <div v-if="slides.length === 0" class="empty-slides">
      <p>尚無投影片</p>
      <p class="text-muted">請在左側輸入專案 Markdown</p>
    </div>

    <template v-else>
      <!-- Summary Slides -->
      <div
        v-for="(slide, index) in slides.filter(s => s.type === 'summary')"
        :key="'summary-' + index"
        class="slide-card summary-slide"
      >
        <div class="slide-title">專案進展彙整 {{ index + 1 }}</div>
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
              v-for="project in slide.projects" 
              :key="project.name"
              class="clickable-row"
              @click="$emit('jumpToLine', project.lineNumber)"
            >
              <td>
                <span class="status-light" :class="getStatusClass(project.status)">
                  {{ getStatusIcon(project.status) }}
                </span>
              </td>
              <td>{{ project.name }}</td>
              <td>{{ project.currentState }}</td>
              <td>{{ project.progress }}%</td>
              <td>{{ project.contact }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Project Detail Slides -->
      <div
        v-for="(slide, index) in slides.filter(s => s.type === 'project')"
        :key="'project-' + index"
        class="slide-card project-slide clickable-slide"
        @click="$emit('jumpToLine', slide.project?.lineNumber ?? 0)"
      >
        <div class="slide-header">
          <span class="status-light" :class="getStatusClass(slide.project?.status)">
            {{ getStatusIcon(slide.project?.status) }}
          </span>
          <div class="slide-title">{{ slide.project?.name }}</div>
        </div>

        <!-- Basic Info Section - Compact Layout -->
        <div class="info-section">
          <div class="info-row">
            <div class="info-item">
              <span class="info-label">狀態</span>
              <span class="info-value">{{ slide.project?.currentState || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">進度</span>
              <span class="info-value">{{ slide.project?.progress }}%</span>
            </div>
            <div class="info-item">
              <span class="info-label">窗口</span>
              <span class="info-value">{{ slide.project?.contact || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">分類</span>
              <span class="info-value">{{ slide.project?.category || '-' }}</span>
            </div>
          </div>
          <!-- Departments Row - Expandable -->
          <div class="departments-row">
            <div class="dept-item">
              <span class="dept-label">主辦</span>
              <span class="dept-value">{{ formatDepartments(slide.project?.departments.主辦) || '-' }}</span>
            </div>
            <div class="dept-item dept-partners">
              <span class="dept-label">協辦</span>
              <span class="dept-value" :title="formatDepartments(slide.project?.departments.協辦)">
                {{ formatDepartments(slide.project?.departments.協辦) || '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Timeline Gantt Chart -->
        <div v-if="slide.project?.phases.length" class="timeline-section">
          <div class="section-title">時程</div>
          <div class="timeline-gantt">
            <!-- Phase arrows -->
            <div class="gantt-phases">
              <div
                v-for="(phase, i) in slide.project.phases"
                :key="phase.name"
                class="gantt-phase"
                :style="getPhaseStyle(slide.project.phases, i)"
              >
                <div class="phase-arrow" :style="getPhaseArrowStyle(phase.name, i, slide.project.phases.length)">
                  <span class="phase-name">{{ phase.name }}</span>
                  <span class="phase-dates">{{ formatPhaseDate(phase) }}</span>
                </div>
              </div>
            </div>
            <!-- Today pin -->
            <div
              v-if="showTodayPin(slide.project.phases)"
              class="today-pin"
              :style="getTodayPinStyle(slide.project.phases)"
            >
              <div class="today-line"></div>
              <div class="today-marker">📍</div>
              <div class="today-label">今天</div>
            </div>
          </div>
        </div>

        <!-- Meeting Notes (bottom 2/3) -->
        <div class="notes-section">
          <div class="section-title">會辦狀況</div>
          <div class="meetings-list">
            <div
              v-for="(meeting, i) in slide.project?.meetings.slice(0, 5)"
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
                  :class="{
                    tracking: line.isTracking,
                    planned: line.isPlanned
                  }"
                >
                  {{ line.text }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="slide.project?.notes.length" class="other-notes">
            <div class="section-title">其他補充</div>
            <ul>
              <li v-for="(note, i) in slide.project?.notes.slice(0, 3)" :key="i">
                {{ note }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { parseMarkdown, generateSlides, type Slide } from '@/utils/parser'
import { getStatusClass, getStatusIcon } from '@/utils/status'
import { 
  getPhaseStyle, 
  getPhaseArrowStyle, 
  formatPhaseDate, 
  showTodayPin, 
  getTodayPinStyle 
} from '@/utils/timeline'

const props = defineProps<{
  content: string
}>()

defineEmits<{
  jumpToLine: [lineNumber: number]
}>()

const slides = computed<Slide[]>(() => {
  if (!props.content.trim()) return []
  try {
    const projects = parseMarkdown(props.content)
    return generateSlides(projects)
  } catch (e) {
    console.error('Parse error:', e)
    return []
  }
})

// Format departments array to comma-separated string
const formatDepartments = (departments: string[] | undefined): string => {
  if (!departments || departments.length === 0) return ''
  return departments.join(', ')
}
</script>

<style scoped>
.slides-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.empty-slides {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
}

.slide-card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-lg);
  color: #1a1a1a;
  min-height: 300px;
}

.slide-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.slide-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
}

/* Summary Table */
.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-md);
}

.summary-table th,
.summary-table td {
  padding: var(--spacing-xs) var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.summary-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.col-status { width: 60px; text-align: center; }
.col-name { width: 30%; }
.col-state { width: 20%; }
.col-progress { width: 80px; text-align: center; }
.col-contact { width: 15%; }

/* Clickable elements */
.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover {
  background-color: #f0f9ff;
}

.clickable-slide {
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.clickable-slide:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* Info Section - Card Layout */
.info-section {
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid #e5e7eb;
}

.info-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f9fafb;
  border-radius: var(--radius-sm);
}

.info-label {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
}

.info-value {
  font-size: var(--font-size-sm);
  color: #1e293b;
  font-weight: 500;
}

/* Departments Row */
.departments-row {
  display: flex;
  gap: var(--spacing-md);
}

.dept-item {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.dept-label {
  color: #6b7280;
  font-weight: 500;
  flex-shrink: 0;
}

.dept-value {
  color: #1e293b;
}

/* Allow long partner lists to wrap */
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

/* Timeline Section */
.timeline-section {
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid #e5e7eb;
}

.timeline-gantt {
  position: relative;
  height: 50px;
  margin-top: var(--spacing-sm);
}

.gantt-phases {
  position: relative;
  height: 36px;
  display: flex;
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
  padding: 0 var(--spacing-sm);
  color: white;
  font-size: 11px;
  font-weight: 600;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* First arrow has no left notch */
.gantt-phase:first-child .phase-arrow {
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%);
}

.phase-name {
  line-height: 1.2;
}

.phase-dates {
  font-size: 9px;
  opacity: 0.9;
  font-weight: 400;
}

/* Phase colors are now applied via inline styles for dynamic phase support */

/* Today Pin */
.today-pin {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.today-line {
  position: absolute;
  top: 0;
  bottom: 12px;
  width: 2px;
  background: #ef4444;
}

.today-marker {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
}

.today-label {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: #ef4444;
  font-weight: 600;
  white-space: nowrap;
}

/* Notes Section */
.notes-section {
  flex: 1;
}

.section-title {
  font-weight: 600;
  color: #374151;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.meetings-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.meeting-entry {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.meeting-date {
  color: #6b7280;
  width: 90px;
  flex-shrink: 0;
  font-weight: 500;
}

.meeting-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meeting-line {
  color: #1f2937;
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

.other-notes {
  margin-top: var(--spacing-md);
}

.other-notes ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.other-notes li {
  font-size: var(--font-size-sm);
  color: #4b5563;
  margin-bottom: var(--spacing-xs);
}

.status-light {
  font-size: 12px;
}
</style>
