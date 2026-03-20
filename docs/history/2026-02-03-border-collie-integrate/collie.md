# Collie

BorderCollie 是一個現代化、輕量級的專案管理與人力資源甘特圖工具。它專為快速編輯與視覺化設計，支援純文字格式定義專案，並即時轉換為互動式甘特圖。  

Sheltie 是一個 Markdown 線上協同編輯工具，可依循固定格式編寫專案進展，自動整理成投影片，並提供線上投影片播放和匯出 PPTX 功能。

實際使用後, 決定把 Sheltie 和 BorderCollie 合併, 方便對專案進行更全面管理.

## 專案結構

- 為了維持 BorderCollie 輕量級專案獨立使用與開發, 透過 git submodule 引入 BorderCollie 至 Sheltie 專案.
- 修改 BorderCollie 專案內程式架構, 讓 BorderCollie 專案人力甘特圖編輯區, 檢視區, 匯出 ... 等功能模組可以結構化被呼叫引用.
- 盡量統一 BorderCollie 和 Sheltie UI/UX 基礎元件.

## 專案需求

### WorkSpace

- 保留 Sheltie 的前後端分離, 後端儲存資料庫的設計
- 資料格式擴充為 "專案進度資料 (原shelite)" 和 "專案人力配置資料 (原 bordercollie)" 兩份資料

### 資料格式

- 專案進度資料 (shelite) 的專案時程區塊移除, 專案時程相關資料從 專案人力配置 (bordercollie) 中專案階段取得
- 其餘資料格式內容不變

### 編輯區

- 專案進度編輯保留純文字編輯區, 移除 WYSIWYG 編輯模式
- 擴充專案人力配置文字編輯和表單編輯

### 檢視區

- 保留 Sheltie 的投影片預覽、投影片播放、下載 PPTX 功能
- 擴充 BorderCollie 的甘特圖檢視區
