# Repository Guidelines

## 專案結構與模組規劃
- `client/` 為 Vite + React 前端，UI 元件集中在 `client/src/components/`，共享 hook 於 `client/src/hooks/`，型別宣告於 `client/src/types/`，服務封裝於 `client/src/services/`。
- `server/` 採 TypeScript + Express + Socket.IO，路由放於 `server/src/routes/`，整合程式放在 `server/src/lib/`，Prisma schema 與 migration 位於 `server/prisma/`。
- `docs/` 紀錄設計決策與時程，`.github/` 存放 CI 與 Issue 模板；執行期檔案（如 `server/uploads/`）已列入 `.gitignore`。

## 建置、測試與開發指令
- `npm install`：於倉庫根目錄執行，安裝前後端依賴並同步 lockfile。
- `npm run dev`：同時啟動 `server/src/index.ts` 與 `client/src/main.tsx` 進行本機開發。
- `npm run build`：執行 `tsc` 與 `vite build` 產出部署用套件。
- `cd server && npm run test:run`：以非監聽模式執行 Vitest，適用於 CI。
- `cd server && npm run lint`、`cd client && npm run lint`：檢查 TypeScript 與 React 程式風格，建議提交前執行。
- `npm start`：啟動已編譯的後端（`server/dist/index.js`），請先完成 build。

## 程式風格與命名慣例
- 全域使用兩個空白縮排與 TypeScript 嚴格模式；盡量以 `client/src/types/` 或 `server/src/types/` 定義介面避免 `any`。
- React 元件與 Context 採 `PascalCase`，hook 以 `use` 開頭，工具函式採 `camelCase`，常數則用 `SCREAMING_SNAKE_CASE`。
- ESLint 設定見各套件的 `.eslintrc`，可搭配 `--fix` 但請檢查輸出以維持可讀性。

## 測試指引
- 後端測試集中於 `server/tests/`，以 `.test.ts` 結尾；撰寫情境式案例覆蓋 REST 與 Socket.IO 行為，並 mock OpenAI、Redis、Prisma 等外部服務。
- 前端互動可採元件測試或短片（GIF）記錄；無法自動化時務必於 PR 說明驗證方式與受影響畫面。
- 修復缺陷時優先補齊對應測試，若暫時無法覆蓋，請於 `docs/testing-notes.md` 記錄風險與補強計畫。

## Commit 與 Pull Request 準則
- 採用 Conventional Commits（如 `feat:`、`fix:`、`docs:`），主旨 <= 72 字元，必要時加上範圍說明。
- PR 需描述需求背景、核心變更與測試結果（例：`npm run test:run`），並使用 `Closes #123` 連結 Issue；UI 變更附上截圖或錄影。
- 僅於 CI 綠燈後請求審核，並再次確認 `.env` 與憑證檔未被提交。

## 環境與安全提示
- 依 `server/.env.example` 建立本地設定；實際憑證請使用 `.env` 與 `google-credentials.json` ，嚴禁推送至 Git。
- 如需啟用向量搜尋，請先啟動含 pgvector 的 PostgreSQL，再執行 `npm start`；改變資料庫供應時，使用 `cd server && npm run migrate:sqlite-to-postgres` 更新 schema。
