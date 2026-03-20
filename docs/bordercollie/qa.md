> 請分析目前專案, 同時分析 需求說明, 先確認是否有需釐清的項目.

---

## ❓ 需釐清的項目

1. 資料整合策略：現有 BorderCollie 使用 LocalStorage 儲存，Sheltie 使用 SQLite 後端。合併後：
    - 是否將 BorderCollie 資料改為透過後端 API 儲存？
    - 還是維持兩份分開的資料來源？
2. 時程資料同步問題：需求說「Sheltie 的時程從 BorderCollie 取得」，但兩者格式不同：
    - Sheltie 時程格式：- 階段名: YYYY-MM-DD ~ YYYY-MM-DD
    - BorderCollie 時程格式：- 階段名, 開始日期, 結束日期: 人員指派
    - 轉換邏輯是否需要即時同步？還是唯讀顯示？
3. 人員資料關聯：Sheltie 有「窗口」欄位，BorderCollie 有完整的人力配置。是否需要：
    - 將 Sheltie 的「窗口」對應到 BorderCollie 的人員？
    - 還是兩者獨立管理？
4. UI 統一範圍：需求提到「盡量統一 UI/UX 基礎元件」，具體包括哪些？
    - 兩者都有 `SplitPane.vue`，但實作略有差異
    - 主題切換（深淺色）邏輯是否要統一？
    - 是否需要建立共用 component library？
5. 協同編輯功能：Sheltie 支援 WebSocket 協同編輯，BorderCollie 不支援。合併後：
    - BorderCollie 的人力配置資料是否也需要支援協同編輯？
6. 現有功能保留範圍：
    - BorderCollie 的 Excel VBA 版本是否繼續維護？
    - BorderCollie 的 Gist 同步功能是否保留？還是改由後端統一管理？
7. 模組化重構程度：需求提到「讓 BorderCollie 功能模組可結構化被呼叫引用」，這是指：
    - 把 BorderCollie 的 Vue 組件抽成可重用模組？
    - 還是只需要在 Sheltie 中嵌入 BorderCollie 的視圖？

### Answer

1. BorderCollie submodule 專案內仍維持 LocalStorage 取得, 而 Sheltie 則是從 SQLite 取得資料後引用 BorderCollie 的函式庫來處理資料. 所以可能需重構 BorderCollie 的資料取得和處理函式.
2. 為了向下相容: 
    - 若 BorderCollie 中有相同名字的專案, 專案時程以 BorderCollie 為主, 可忽略 Sheltie 資料中時程區塊
    - 若 BorderCollie 中找不到相同名字的專案, 才以 Sheltie 資料中時程區塊
3. 兩者獨立管理
4. 主題切換和配色統一, 可建立共用 component library
5. 同 "1" BorderCollie submodule 內保持不變, Sheltie 中引用 BorderCollie 相關功能來處理, 需支援協同編輯.
6. 原 BorderCollie 的功能不變, 而擴充後的 Sheltie 不需要 Excel VBA 和 Gist 功能, 一律由後端統一管理.
7. 把 BorderCollie 的 Vue 組件抽成可重用模組

看了你的疑問後, 再次強調, 不是把兩個專案合併, BorderCollie 仍保持可以獨立運作的輕量化工具, 而 Sheltie 引用 BorderCollie 中的資料函式和 UI 來擴充甘特圖功能.
BorderCollie 可能需要一定程度重構方能被 Sheltie 引用, 但請確保重構後 BorderCollie 仍可獨立運行, 不會被 Sheltie 污染
請問是否還有待釐清部分?

---

## ❓ 需釐清的項目

1. 共用 component library 位置：
    - 放在 border-collie/src/shared/ 並由 Sheltie 引用？
    - 還是建立獨立的 shared/ 資料夾在專案根目錄？
2. 模組引用方式：Sheltie frontend 如何引用 BorderCollie？
    - 方案 A：直接 import submodule 路徑 (如 import { ProjectGantt } from '../border-collie/src/...')
    - 方案 B：透過 npm workspace / package.json 依賴
    - 方案 C：BorderCollie build 成 library 後引用
3. 甘特圖組件資料來源：BorderCollie 的 ProjectGantt / PersonGantt 目前直接從 store 取資料，Sheltie 引用時：
    - 改為透過 props 傳入資料（更彈性）？
    - 還是建立 adapter 抽象資料來源？
4. Sheltie 後端 API 擴充：
    - 資料結構需擴充 collie_content 欄位？
    - 還是新建獨立的 table/API endpoint？

### Answer

1. 放在 border-collie/src/shared/ 並由 Sheltie 引用
2. 方案 A
3. 個人偏向改為透過 props 傳入資料, 但這題你可以分析後自行作主
4. 資料結構需擴充 collie_content 欄位
