# Phase 4 Spike · 資料持久化與權限整合

> **建立日期**: 2025-10-06  
> **作者**: GitHub Copilot  
> **目的**: 釐清 Phase 4 主要里程碑（資料庫遷移、權限、測試、RAG 強韌性、API Key UI），並列出 Spike 研究項目、待決議事項與建議的技術方案。

---

## 1. 資料遷移 Spike（SQLite → PostgreSQL）

### 目標
1. 驗證 PostgreSQL 執行個體與 pgvector 可在本地 / CI / 雲端正常運作。
2. 規劃一次性匯入腳本，將既有 SQLite (`dev.db`) 資料遷移到 PostgreSQL。
3. 設計回溯方案，讓仍使用 SQLite 的開發者可以無痛切換與還原。

### Spike 任務
- [ ] 建立本地 docker-compose（或使用現有 pgvector 叢集）啟動 PostgreSQL，確認 `initializePgVector()` 能成功跑完。
- [ ] 撰寫 `scripts/migrate-sqlite-to-postgres.ts` 草稿，流程：
  1. 讀取 SQLite `dev.db`，透過 Prisma `sqliteClient` 抽取資料。
  2. 轉換 Prisma 型別與 JSON 欄位，批次寫入 PostgreSQL。
  3. 驗證關聯（documents ↔ projects/folders/permissions/chatHistory）。
- [ ] 研究 Prisma `push` vs `migrate` 在 provider 變更時的行為，必要時手動建立 `migrations/20xx_phase4_postgres`。
- [ ] 建立 fallback 策略：
  - `.env` 允許 `DATABASE_URL` 指向 SQLite，若偵測為 SQLite 則跳過 PostgreSQL 專屬功能（顯示警示）。
  - 提供 `npm run db:export` / `db:import` 腳本，方便使用者備份還原。
- [ ] 更新文件（`PROGRESS.md`, `.github/copilot-instructions.md`, `RAG_SETUP.md`）說明環境變更與遷移步驟。

### 待決議
- 是否將 PostgreSQL 與 pgvector 放在同一個資料庫（schema 區隔）？
- 本地與 CI 是否採用 docker services？若無 docker，是否提供 Railway / Supabase 快速方案？
- 匯入腳本是否需要支援增量同步（或僅一次性 snapshot）？

---

## 2. 權限 API 與 UI 規劃

### 目標
1. 從 `DocumentPermission` 延伸出完整的讀寫權限模型。
2. 提供分享鏈結 / 使用者邀請 UI，使得前端依權限切換唯讀 / 可編輯模式。
3. 保持 API 回傳資料與 Prisma schema 一致，避免資料外洩。

### 待開發的後端元件
- `guards/documentAccess.ts`
  - `assertCanRead(documentId, userId)`
  - `assertCanEdit(documentId, userId)`
- 路由調整：
  - `routes/documents.ts`、`routes/document.ts`（若拆分）加上 guard。
  - `routes/project.ts`、`routes/chatHistory.ts` 也需檢查（AI 訊息屬於特定 document）。
- 分享 API：
  - `POST /api/documents/:id/share` （body: email, permission）。
  - `DELETE /api/documents/:id/share/:permissionId`。
  - Email lookup 與 user onboarding 待定（暫用直接輸入 user email）。

### 前端介面建議
- 新增 `SettingsDrawer` 或 `ShareModal`：
  - 可搜尋現有使用者（autocomplete）。
  - 顯示已分享名單 + 權限（read/write）。
  - 提供切換唯讀模式；若無寫入權限則鎖定 toolbar + 自動儲存。
- 在 `ProjectSidebar` 及 `MarkdownEditor` 顯示鎖頭圖示（唯讀提示）。
- 在 `useCollaboration` / `useAutoSave` 中尊重唯讀狀態（禁止送出編輯事件）。

### Spike 任務
- [ ] 盤點目前所有觸及 document/project 的 API，列出需要 guard 的清單。
- [ ] 設計 Prisma 查詢（include document + permissions）以減少 N+1。
- [ ] Prototype 前端唯讀狀態切換（UI 層先用 mock data 驗證）。

---

## 3. 測試骨架建置

### 目標
- 建立可在 CI 執行的單元 / 整合測試（後端），涵蓋 auth、documents、chat SSE。
- 前端以 Vitest + React Testing Library 為基底，針對 `useChat` 串流流程撰寫第一個測試。
- 規劃 E2E 測試（Playwright），日後覆蓋關鍵使用者流程。

### 後端測試建議
- 安裝 `vitest`, `supertest`, `@vitest/ui`, `prisma-test-utils`（或自製 test harness）。
- 目錄結構：
  ```
  server/
    tests/
      helpers/
        prismaTestEnv.ts
      auth.test.ts
      documents.test.ts
      chat.sse.test.ts
  ```
- `chat.sse.test.ts` 利用 Supertest + EventSource polyfill 驗證 `[DONE]` 與錯誤情境。
- 提供 command：`npm run test` → `vitest --run`。

### 前端測試建議
- 在 `client/package.json` 加入 `vitest`, `@testing-library/react`, `@testing-library/user-event`。
- `src/__tests__/useChat.test.tsx`：mock EventSource、驗證 chunk aggregation、error handling。
- 未來擴充 `ChatBotPanel` UI 與縮放面板行為測試。

### E2E 規劃
- 選擇 Playwright：
  - `tests/e2e/editor.spec.ts` 走訪：登入 → 開啟文件 → 等待 SSE 回覆 → 匯出 DOCX。
  - 在 CI 啟動 server/client（或使用 headless backend mock）。

---

## 4. RAG 快取與向量更新的 Fallback/監控

### 目標
- 讓 Redis 或 pgvector 失效時，系統仍可提供退化但可用的行為。
- 增加監控與告警，方便 Ops 追蹤錯誤。

### 建議方案
1. **Redis fallback**：
   - 當 `cacheService.isAvailable() === false` 時，直接跳過快取並記錄 `warn`。
   - 支援可設定的 `CACHE_STRATEGY`（"required" | "optional"）。optional 時不阻擋請求。
2. **pgvector fallback**：
   - `initializePgVector` 失敗時，RAG API 回傳明確錯誤（HTTP 503），前端 UI 顯示降級訊息。
   - 加入健康檢查端點 `/api/rag/health`。
3. **重新索引工具**：
   - `scripts/rag-reindex.ts` 可重建 embeddings（批次 + 進度 log）。
4. **監控**：
   - 將 Redis / pgvector 連線錯誤蒐集到共用 logger。
   - 評估整合 Prometheus 指標或簡易 `/metrics` JSON。

### Spike 任務
- [ ] 寫出 fallback 流程圖，決定錯誤訊息對前端的顯示方式。
- [ ] 研究 `pgvector` 在無 extension 情況下的錯誤型別，確保 catch 正確。
- [ ] 檢視現有 `batchProcessor.ts`，確認是否需加入重試與 dead-letter 機制。

---

## 5. 前端 API Key / URL 設定面板

### 目標
- 提供 UI 讓使用者輸入 OpenAI API Key、API Base URL、Google Search Engine ID、Google Credentials JSON。
- 減少手動建立 `.env` 或 JSON 的門檻，支援個人化設定。

### 功能範圍
- 前端儲存：
  - 使用 `localStorage` 或 IndexedDB 儲存使用者輸入（client-only）。
  - 可選擇是否將 Key 傳送給後端並快取在 session（需安全評估）。
- 設定面板：
  - 入口：側邊欄「⚙️ 設定」按鈕或頂部工具列。
  - 欄位：
    - OpenAI API Key
    - OpenAI API Base URL（非必填，支援 Azure / proxy）
    - Google Search Engine ID (cx)
    - Google Service Account JSON（可使用多行輸入框並即時驗證 JSON）
  - 提供測試按鈕（call backend `/api/chat/models` 或 `/api/research/status`）。
- 與後端整合：
  - 若要代理後端請求，需新增設定 API。例如 `POST /api/settings/credentials`（加密後儲存在資料庫或記憶體）。
  - 若不改後端，則可能無法真正使用（因為 server 仍使用環境變數）。Spike 需確定最終策略。

### Spike 任務
- [ ] 設計 UI 草稿（可用 Figma 或 Storybook）。
- [ ] 研究是否能在後端使用 `req.headers['x-openai-key']` 取代環境變數（注意安全問題）。
- [ ] Demo 原型：前端 modal 可暫存 Key 並顯示測試結果（mock fetch）。

### 風險 / 決策點
- 安全性：是否允許每位使用者存放不同的 API Key？需避免寫入資料庫時明文儲存。
- Google Credentials JSON 若在前端輸入，必須透過後端轉換成 JWT token（不可直接於前端呼叫官方 API）。
- 若使用 localStorage，需強調「僅適用於本機」且無法跨裝置同步。

---

## 6. 時程與交付建議

| 工作項目 | 估計工時 | 產出 | 備註 |
|----------|----------|------|------|
| PostgreSQL Spike | 2-3 天 | 研究報告 + 初版匯入腳本 | 需同步 DevOps |
| 權限 API / UI 設計 | 2 天 | API 合約 + UI wireframe | 與設計師/PM 協作 |
| 測試骨架搭建 | 1-2 天 | `npm run test`、前端 `vitest` 指令 | 需調整 CI |
| RAG Fallback & Monitoring | 1 天 | Flowchart + 健康檢查/告警策略 | 可與 Spike 同步 |
| API Key 設定原型 | 1-2 天 | Modal 原型 + 使用者指引 | 需安全審核 |

---

## 7. Spike 交付 Checklist

- [ ] 完成 PostgreSQL / pgvector 連線測試並記錄環境設定。
- [ ] 匯入腳本雛形 + rollback 策略。
- [ ] 權限 guard 設計稿（圖示/流程）與 API 合約草案。
- [ ] 後端/前端測試命令可執行（即使目前僅含 smoke test）。
- [ ] RAG fallback 流程與監控計畫撰寫完成。
- [ ] API Key 設定 UI 原型（含安全性備註）。

> ✅ Spike 完成後，請更新 `PROGRESS.md` 及 `.github/copilot-instructions.md`，並在 Phase 4 backlog 中建立對應任務。