# Arrow Gantt Chart Design Prompt

## 設計目標

實作箭頭式甘特圖，用於顯示專案時程階段。每個階段以箭頭形狀呈現，箭頭連續排列形成視覺流程，並標示「今天」位置。

---

## 視覺規格

### 箭頭形狀

使用 CSS `clip-path` 創建箭頭形狀：

```css
/* 標準箭頭 - 左右都有凹凸 */
.phase-arrow {
  clip-path: polygon(
    0 0,                    /* 左上 */
    calc(100% - 10px) 0,    /* 右上 (留出箭頭尖) */
    100% 50%,               /* 右側箭頭尖端 */
    calc(100% - 10px) 100%, /* 右下 */
    0 100%,                 /* 左下 */
    10px 50%                /* 左側內凹 (接續前一箭頭) */
  );
}

/* 第一個箭頭 - 左側無內凹 */
.gantt-phase:first-child .phase-arrow {
  clip-path: polygon(
    0 0,
    calc(100% - 10px) 0,
    100% 50%,
    calc(100% - 10px) 100%,
    0 100%
  );
}
```

### 箭頭重疊

- 後續箭頭向左偏移 `8px` 以形成視覺連續感
- Z-index 設定：越早的階段 z-index 越高 (`totalPhases - index`)，確保箭頭尖端在上層

### 顏色漸層

使用 `linear-gradient(135deg, ...)` 從左上到右下的漸層：

| 階段 | 起點色 | 終點色 | 色系 |
|------|--------|--------|------|
| 開發 (DEV) | #60a5fa | #3b82f6 | 藍 |
| SIT | #34d399 | #10b981 | 綠 |
| QAS | #fbbf24 | #f59e0b | 黃 |
| REG | #f472b6 | #ec4899 | 粉紅 |
| PROD | #a78bfa | #8b5cf6 | 紫 |

### 文字樣式

```css
.phase-arrow {
  color: white;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.phase-dates {
  font-size: 9px;
  opacity: 0.9;
  font-weight: 400;
}
```

---

## Today Pin 設計

在時間軸上標示當前日期位置：

```css
.today-pin {
  position: absolute;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.today-line {
  width: 2px;
  background: #ef4444; /* 紅色 */
}

.today-marker {
  font-size: 10px; /* 使用 📍 emoji 或 SVG */
}

.today-label {
  font-size: 9px;
  color: #ef4444;
  font-weight: 600;
  white-space: nowrap;
}
```

---

## 位置計算邏輯

### 階段位置與寬度

```typescript
const getPhaseStyle = (phases: Phase[], index: number) => {
  const totalPhases = phases.length
  const width = 100 / totalPhases           // 等寬分配
  const left = index * width
  const overlap = index > 0 ? 8 : 0         // 箭頭重疊距離
  
  return {
    left: `calc(${left}% - ${overlap}px)`,
    width: `calc(${width}% + ${overlap}px)`,
    zIndex: totalPhases - index             // 早期階段在上層
  }
}
```

### Today Pin 位置

```typescript
const getTodayPinPosition = (phases: Phase[]): number => {
  const today = new Date()
  const firstStart = new Date(phases[0].startDate)
  const lastEnd = new Date(phases[phases.length - 1].endDate)
  
  const totalDuration = lastEnd.getTime() - firstStart.getTime()
  const elapsed = today.getTime() - firstStart.getTime()
  
  return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100))
}

// 只在日期範圍內顯示 Today Pin
const showTodayPin = (phases: Phase[]): boolean => {
  const today = new Date().toISOString().split('T')[0]
  return today >= phases[0].startDate && 
         today <= phases[phases.length - 1].endDate
}
```

---

## HTML 結構

```html
<div class="timeline-gantt">
  <!-- 階段箭頭 -->
  <div class="gantt-phases">
    <div 
      v-for="(phase, i) in phases" 
      class="gantt-phase"
      :class="getPhaseClass(phase.name)"
      :style="getPhaseStyle(phases, i)"
    >
      <div class="phase-arrow">
        <span class="phase-name">{{ phase.name }}</span>
        <span class="phase-dates">{{ formatDate(phase) }}</span>
      </div>
    </div>
  </div>
  
  <!-- Today Pin -->
  <div 
    v-if="showTodayPin(phases)" 
    class="today-pin"
    :style="{ left: getTodayPinPosition(phases) + '%' }"
  >
    <div class="today-line"></div>
    <div class="today-marker">📍</div>
    <div class="today-label">今天</div>
  </div>
</div>
```

---

## 完整 CSS 範例

```css
.timeline-gantt {
  position: relative;
  height: 50px;
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
  padding: 0 8px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%);
}

.gantt-phase:first-child .phase-arrow {
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%);
}

/* 階段顏色 */
.phase-dev .phase-arrow { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
.phase-sit .phase-arrow { background: linear-gradient(135deg, #34d399, #10b981); }
.phase-qas .phase-arrow { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.phase-reg .phase-arrow { background: linear-gradient(135deg, #f472b6, #ec4899); }
.phase-prod .phase-arrow { background: linear-gradient(135deg, #a78bfa, #8b5cf6); }

/* Today Pin */
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
}
```

---

## 設計要點總結

1. **箭頭連續感**: 使用 clip-path + 8px 向左偏移
2. **層次感**: z-index 讓早期階段覆蓋後期
3. **漸層方向**: 135deg (左上 → 右下) 統一視覺
4. **可讀性**: 白字 + text-shadow
5. **Today Pin**: 紅色線條 + emoji 標記，僅在日期範圍內顯示
