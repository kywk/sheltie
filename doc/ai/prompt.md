# 🤖 Sheltie AI 開發指南 (Prompt)

此文件提供 AI 輔助開發 Sheltie 專案時的提示詞範本，幫助快速建構類似的專案進展協作工具。

---

## 📋 專案概述提示

```
我想開發一個專案進展協作工具，具備以下功能：

1. **Markdown 協同編輯**
   - 多人即時編輯，WebSocket 同步
   - 左側編輯器、右側即時預覽
   - 支援分割面板拖曳調整

2. **自動投影片生成**
   - 依據固定 Markdown 格式解析專案資訊
   - 生成總覽頁（所有專案燈號表格）
   - 生成專案詳情頁（甘特圖、會辦記錄）

3. **簡報模式**
   - 全螢幕播放投影片
   - 鍵盤操作（←/→ 換頁、ESC 離開）
   - PPTX 匯出

技術堆疊：
- Frontend: Vue 3 + TypeScript + Vite + Pinia
- Backend: Go + Gin Framework
- Database: SQLite
- 即時同步: WebSocket
```

---

## 🏗️ 架構設計提示

```
請設計專案的檔案結構：

後端 (Go):
- main.go: 主程式、路由設定
- handlers/: HTTP 處理器（workspace CRUD、admin 驗證）
- websocket/: 協同編輯 Hub 和 Client 管理
- database/: SQLite 初始化和查詢
- config/: 環境變數讀取

前端 (Vue 3):
- components/:
  - HomePage.vue: 首頁工作區列表
  - WorkspaceView.vue: 編輯器主介面
  - SlidePreview.vue: 投影片預覽元件
  - PresentationView.vue: 全螢幕簡報
  - AdminPanel.vue: 管理介面
  - SplitPane.vue: 分割面板元件
- stores/: Pinia 狀態管理（WebSocket 連線、游標同步）
- utils/parser.ts: Markdown 解析器
- router/: 路由配置
```

---

## 📝 Markdown 解析器提示

```
請實作 Markdown 解析器 (parser.ts)，解析以下格式：

輸入格式：
- 以 "# " 開頭為專案名稱
- "## 基本資訊" 區塊包含燈號、狀態、進度、窗口、分類、時程、相關單位
- "## 會辦狀況" 區塊包含日期和縮排的會議內容
- 專案之間用 "---" 分隔

輸出資料結構：
interface Project {
  name: string
  status: '綠' | '黃' | '紅'
  currentState: string
  progress: number
  contact: string
  category: string
  phases: { name: string, startDate: string, endDate: string }[]
  departments: { 主辦: string, 協辦: string }
  meetings: { date: string, lines: { text: string, isTracking: boolean, isPlanned: boolean }[], isOld: boolean }[]
  notes: string[]
  lineNumber: number  // 用於點擊跳轉
}

特殊處理：
- _待追蹤_ 開頭的行標記為 isTracking
- _預計_ 開頭的行標記為 isPlanned
- 超過一個月的會議記錄標記為 isOld
```

---

## 🎨 投影片生成提示

```
請實作投影片生成邏輯：

1. 總覽投影片 (Summary)
   - 每頁顯示最多 10 個專案
   - 表格欄位：燈號、專案名稱、狀態、進度、窗口
   - 依燈號(紅>黃>綠)、分類、結束日期排序

2. 專案詳情投影片 (Project)
   - 標題列：專案名稱 + 狀態/進度/窗口/分類標籤
   - 主辦/協辦單位
   - 甘特圖：各階段時程（開發/SIT/QAS/REG/PROD）
   - 今日標記（紅色垂直線）
   - 會辦狀況列表

投影片陣列結構：
interface Slide {
  type: 'summary' | 'project'
  projects?: Project[]  // summary 用
  project?: Project     // project 用
}
```

---

## 🔄 WebSocket 協同編輯提示

```
請實作 WebSocket 協同編輯功能：

後端 Hub:
- 管理多個 workspace 的連線
- 廣播訊息類型：
  - content_update: 內容更新
  - cursor_update: 游標位置（userId, position, selectionStart, selectionEnd）
  - user_joined/user_left: 使用者進出

前端 Store (Pinia):
- 連接 WebSocket
- 維護 content、connectedUsers、remoteCursors
- 發送游標位置更新
- 處理遠端使用者游標顯示

游標顯示：
- 隨機分配使用者顏色
- 在編輯器中顯示其他使用者的游標位置
- 選取範圍高亮顯示
```

---

## 🖼️ 簡報模式提示

```
請實作全螢幕簡報模式 (PresentationView.vue)：

UI 設計：
- 深色背景 (#111827)
- 白色投影片容器，置中顯示
- 底部導覽列：左右箭頭、頁碼/總頁數、離開按鈕

互動操作：
- 點擊投影片右半部 → 下一頁
- 點擊投影片左半部 → 上一頁
- 鍵盤 ArrowRight/Space → 下一頁
- 鍵盤 ArrowLeft → 上一頁
- 鍵盤 Escape → 離開簡報

投影片樣式：
- 大字體設計（標題 2.25rem、內文 1.2rem）
- 狀態標籤用彩色圓角矩形
- 甘特圖用箭頭形狀、漸層色
```

---

## 📤 PPTX 匯出提示

```
請使用 pptxgenjs 實作 PPTX 匯出：

import PptxGenJS from 'pptxgenjs'

匯出邏輯：
1. 建立 new PptxGenJS()
2. 設定簡報尺寸 defineLayout({ width: 13.33, height: 7.5 })
3. 遍歷 slides 陣列
4. Summary 頁：插入表格
5. Project 頁：
   - 標題文字
   - 狀態標籤（矩形 + 文字）
   - 甘特圖（箭頭形狀）
   - 會議記錄（項目列表）
6. writeFile('專案進展報告.pptx')
```

---

## 🎯 UI/UX 設計提示

```
請實作現代化的 UI 設計：

設計風格：
- Glassmorphism 效果（半透明背景、模糊）
- 深色/淺色主題切換
- 圓角卡片設計
- 微動畫（hover 效果、transition）

配色方案：
- 狀態標籤：藍(狀態)、綠(進度)、黃(窗口)、紫(分類)
- 燈號：🟢綠、🟡黃、🔴紅
- 甘特圖階段漸層色

響應式設計：
- 分割面板可拖曳調整
- 支援面板收合（只顯示編輯器或預覽）
```

---

## 🔗 點擊跳轉提示

```
請實作預覽點擊跳轉編輯器功能：

1. parser.ts 追蹤 lineNumber
   - parseMarkdown 時記錄每個專案的起始行號

2. SlidePreview.vue 發送事件
   - 專案卡片 @click="$emit('jumpToLine', project.lineNumber)"
   - defineEmits<{ jumpToLine: [lineNumber: number] }>()

3. WorkspaceView.vue 處理跳轉
   - <SlidePreview @jumpToLine="jumpToLine" />
   - jumpToLine(lineNumber): 計算字元位置、focus、setSelectionRange、scrollTop
```

---

## 🐳 Docker 部署提示

```
請建立 Docker 部署配置：

Dockerfile（多階段建構）：
1. Node 階段：build frontend
2. Go 階段：build backend
3. 最終映像：複製靜態檔案和執行檔

docker-compose.yml：
- 環境變數：ADMIN_PASSWORD
- 端口映射：8080:8080
- Volume：./data:/app/data（SQLite 持久化）
```

---

## 💡 進階功能提示

```
可擴充功能：

1. 專案排序
   - 依燈號優先（紅>黃>綠）
   - 依分類、結束日期二次排序

2. 舊會議摺疊
   - 超過一個月的會議預設隱藏
   - 顯示「顯示舊記錄」按鈕

3. 特殊標記高亮
   - _待追蹤_ → 黃色背景
   - _預計_ → 藍色背景

4. 甘特圖今日標記
   - 計算今日在時程中的位置
   - 紅色垂直線 + 📍 標記
```

---

## 📚 參考資源

- Vue 3 Composition API: https://vuejs.org/guide/
- Pinia State Management: https://pinia.vuejs.org/
- Gin Web Framework: https://gin-gonic.com/
- pptxgenjs: https://gitbrent.github.io/PptxGenJS/
- WebSocket in Go: https://github.com/gorilla/websocket
