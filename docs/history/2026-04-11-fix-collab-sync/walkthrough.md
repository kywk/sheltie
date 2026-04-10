# Fix: 共同編輯游標跳動問題

## 修改摘要

解決多人同時編輯時，一位用戶的更新會導致其他用戶游標跳到文件尾端的問題。

## 根因

原本的同步機制是**全文替換**：
- Server 收到任一用戶的內容更新後，將完整新內容廣播給房間內**所有人**（包含發送者）
- Frontend 直接以 `currentWorkspace.value.content = message.content` 覆蓋，觸發 `<textarea v-model>` 重新渲染
- Textarea 重新渲染後，游標位置 (`selectionStart`/`selectionEnd`) 被重設為文件尾端

## 修改內容

### Backend — `backend/websocket/hub.go`

1. **新增 `MessageTypeAck` 常數**：當發送者的寫入成功時，server 回傳精簡的 ACK（僅含 `version` 和 `hash`，不含 `content`），發送者不需要重新載入內容。

2. **新增 `broadcastToRoomExcludeUser` 方法**：用 `UserID` 排除特定用戶，作為 content 廣播時的輔助方法。

3. **修改 content 廣播邏輯**：
   - 向**其他用戶**：廣播完整的 content（含 `userId` 標記原始發送者）
   - 向**發送者**：僅回傳 `ack`（version + hash）

```
Before: broadcastToRoom(workspaceID, fullContent, nil) → 所有人都收到全文
After:  broadcastToRoomExcludeUser() → 其他用戶收到全文
        sendToUser(sender) → 發送者只收到 ack
```

### Frontend Store — `frontend/src/stores/workspace.ts`

1. **新增 `remoteContentUpdate` ref**：作為遠端內容更新的信號，供 View 層監聽。

2. **區分 content 訊息類型**：
   - `ack`：僅更新 `documentVersion` / `documentHash`，不動 `content`
   - 遠端 `content`（`userId ≠ currentUserId`）：設定 `remoteContentUpdate` 信號
   - 衝突 `content`：同上，標記 `conflict: true`

3. **不再直接覆蓋 `currentWorkspace.content`**：改由 View 層的 watch 負責處理。

### Frontend View — `frontend/src/components/WorkspaceView.vue`

1. **移除舊 watch**：刪除直接覆蓋 `content.value` 的 `watch(() => store.currentWorkspace?.content)`。

2. **新增游標保護 watch**：監聽 `store.remoteContentUpdate`，在更新內容前儲存游標狀態，更新後在 `nextTick` 中恢復：

```typescript
watch(() => store.remoteContentUpdate, (update) => {
  const savedStart = textarea.selectionStart
  const savedEnd = textarea.selectionEnd
  const savedScrollTop = textarea.scrollTop

  content.value = update.content

  nextTick(() => {
    textarea.selectionStart = Math.min(savedStart, maxPos)
    textarea.selectionEnd = Math.min(savedEnd, maxPos)
    textarea.scrollTop = savedScrollTop
  })
})
```

## 驗證結果

- ✅ Go backend 編譯成功（`go build ./...` exit code 0）
- ✅ Frontend TypeScript 型別檢查通過（`tsc --noEmit` exit code 0）

## 手動測試步驟

1. 開兩個瀏覽器分頁連到同一 workspace
2. A 在文件中間位置持續輸入文字
3. 觀察 B 的游標是否維持在原來位置（不應跳到尾端）
4. 確認 B 的畫面能看到 A 的最新內容

## 已知限制

- 若兩人同時修改**同一段文字**，仍採「最後寫入者勝出」策略，可能有一方的變更被覆蓋
- 游標恢復是「回到原本位置」，不是「根據遠端插入/刪除自動偏移」；若遠端更動在游標之前，位置可能有些微誤差
- 若需 Google Docs 等級的精準共編，須引入 OT/CRDT（如 Yjs）
