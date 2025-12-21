# 🐕 Sheltie - 專案進展協作工具

Sheltie 是一個 Markdown 線上協同編輯工具，可依循固定格式編寫專案進展，自動整理成投影片，並提供線上投影片播放和匯出 PPTX 功能。

## ✨ 功能特色

### 核心功能
- **Markdown 協同編輯**：多人即時協作編輯專案進展，支援游標位置同步顯示
- **自動投影片生成**：依據規格自動轉換為投影片預覽
- **線上投影片播放**：全螢幕簡報模式，支援鍵盤操作（←/→ 換頁、ESC 離開）
- **PPTX 匯出**：匯出為 PowerPoint 簡報
- **深色/淺色主題**：現代化 Glassmorphism UI 設計

### 編輯功能
- **分割面板**：左側編輯器、右側即時預覽，支援拖曳調整比例
- **快速導覽**：點擊預覽投影片自動跳轉到對應 Markdown 區塊
- **會辦記錄格式化**：支援 `_待追蹤_`、`_預計_` 等強調標記
- **舊記錄自動摺疊**：超過一個月的會辦記錄預設收合

### 簡報投影片
- **總覽頁**：專案燈號、狀態、進度一覽
- **專案詳情頁**：
  - 標題列顯示狀態/進度/窗口/分類標籤
  - 甘特圖時程顯示，含今日標記
  - **自定義階段名稱**：不限固定階段，可自由命名
  - **日期比例顯示**：各階段寬度依實際天數比例
  - **七色循環**：藍→綠→黃→粉紅→紫→橙→青
  - 會辦狀況記錄
- **大字體設計**：適合會議室遠距離觀看

### 管理功能
- **工作區管理**：新增/刪除/修改工作區
- **分享功能**：一鍵生成分享連結
- **密碼保護**：管理介面密碼驗證

## 🚀 快速開始

### 使用 Docker Compose (推薦)

```bash
# 設定管理員密碼
export ADMIN_PASSWORD=your_secure_password

# 啟動服務
docker-compose up -d

# 訪問 http://localhost:8080
```

### 本地開發

**後端 (Go)**
```bash
cd backend
go mod tidy
go run main.go
# 服務運行於 http://localhost:8080
```

**前端 (Vue)**
```bash
cd frontend
npm install
npm run dev
# 開發服務運行於 http://localhost:5173
```

## 📝 Markdown 格式規格

```markdown
# 專案名稱

## 基本資訊
- 燈號: 綠 | 黃 | 紅
- 目前狀態: 提案準備中 | 需求訪談 | 開發中 | SIT | QAS | REG | PROD
- 進度: 50%
- 窗口: Andy
- 分類: AP
- 時程:
  - 需求分析: 2025-12-01 ~ 2025-12-05
  - 設計: 2025-12-06 ~ 2025-12-15
  - 開發: 2025-12-16 ~ 2026-01-15
  - SIT: 2026-01-16 ~ 2026-01-20
  - PROD: 2026-01-21
- 相關單位:
  - 主辦: 資訊處
  - 協辦/協同: 業務處, 企劃處

## 會辦狀況 (日期反序)

- 2025-12-21
  - 已完成 API 開發
  - _待追蹤_ 前端整合測試
  - _預計_ 下週進入 SIT
- 2025-12-20
  - 需求確認會議

## 其他補充
- 注意事項 AAA
- 注意事項 BBB

---

# 下一個專案名稱
...
```

### 格式說明

| 欄位 | 說明 |
|------|------|
| 燈號 | 專案狀態：🟢綠（正常）、🟡黃（注意）、🔴紅（警示） |
| 狀態 | 目前進度階段 |
| 時程 | 各階段日期，可自定義任意階段名稱，用於甘特圖顯示 |
| 會辦狀況 | 日期需為 YYYY-MM-DD 格式，內容需縮排 |
| `_待追蹤_` | 會議記錄中的待追蹤事項（紅色標記） |
| `_預計_` | 會議記錄中的預計事項（藍色標記） |

## 🛠️ 技術架構

- **Frontend**: Vue 3 + TypeScript + Vite + Pinia
- **Backend**: Go + Gin Framework
- **Database**: SQLite
- **協同編輯**: WebSocket (即時同步)
- **PPTX 生成**: pptxgenjs
- **部署**: Docker Compose

## 📁 專案結構

```
sheltie/
├── backend/               # Go 後端
│   ├── main.go           # 主程式入口
│   ├── config/           # 配置管理
│   ├── database/         # SQLite 資料庫
│   ├── handlers/         # HTTP 處理器
│   └── websocket/        # WebSocket 協同編輯
├── frontend/              # Vue 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPanel.vue      # 管理介面
│   │   │   ├── HomePage.vue        # 首頁
│   │   │   ├── PresentationView.vue # 簡報播放
│   │   │   ├── SlidePreview.vue    # 投影片預覽
│   │   │   ├── SplitPane.vue       # 分割面板
│   │   │   └── WorkspaceView.vue   # 工作區編輯
│   │   ├── stores/
│   │   │   └── workspace.ts        # Pinia 狀態管理
│   │   ├── utils/
│   │   │   └── parser.ts           # Markdown 解析器
│   │   └── router/                 # 路由配置
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 🔐 管理介面

訪問 `/admin` 路徑，輸入管理員密碼後可：
- 新增/刪除/修改工作區
- 管理所有專案資料

預設密碼：`admin123`（請在生產環境修改）

## 🖥️ 簡報模式操作

1. 點擊工具列「播放」按鈕進入簡報模式
2. 快捷鍵：
   - `→` / `空白鍵` / `點擊`：下一頁
   - `←`：上一頁
   - `ESC`：離開簡報

## 📄 License

MIT
