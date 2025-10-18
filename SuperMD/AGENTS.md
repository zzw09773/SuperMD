# Repository Guidelines

## 專案結構與模組配置
- `client/`：Vite + React 前端；共用元件放在 `src/components/`，邏輯型 hook 置於 `src/hooks/`，API 協定集中在 `src/services/` 與 `src/types/`，工具函式放在 `src/utils/`。
- `server/`：TypeScript Express 後端，整合 LangChain agents 與 Socket.IO；請將業務模組置於 `src/services/`，路由在 `src/routes/`，跨域工具在 `src/lib/`。
- `docs/`：存放架構研究與功能提案（例如 `phase-4-spike.md`）；重大流程或資料庫調整時同步更新。
- `.env.example` 與 `google-credentials.json.example` 為環境模板；忽略 `node_modules/`、打包輸出及 `uploads/` 等暫存內容。

## 建置、測試與開發指令
- `npm install`：於專案根目錄執行一次，安裝 client/server 所需依賴。
- `npm run dev`：同時啟動 `server/src/index.ts` 與 `client/src/main.tsx`，適合協作與 UI 驗證。
- `npm run dev:server` / `npm run dev:client`：分別專注後端或前端開發。
- `npm run build`：產出正式 bundles；發版前需確認無錯誤。
- `cd server && npm run test:run`：以 CI 模式執行 Vitest。
- `cd client && npm run lint`：檢查 React + TypeScript 程式風格，提交前需通過。

## 程式風格與命名規範
- 全案採 TypeScript，避免使用 `any`；共用型別置於 `src/types/`。
- 遵循 ESLint 指南：匯入順序為第三方套件、內部模組、最後是樣式檔。
- React 元件使用 `PascalCase`，hook 與工具函式採 `camelCase`，環境變數使用 `SCREAMING_SNAKE_CASE`。
- 採 2 空白縮排，移除未使用的匯入與匯出以保持模組精簡。

## 測試指引
- 後端測試存於 `server/tests`，檔名遵循 `*.test.ts` 並對應 API 路由（參考 `chat.sse.test.ts`）。
- 使用輕量 mock 取代 OpenAI、Redis、Prisma 等外部服務，確保 Vitest 可重現。
- 覆蓋 SSE、Socket 協作與文件處理流程，測試描述需標記邊界條件。
- 送出 PR 前執行 `npm run test:run`，並將必要測試資料置於對應模組附近。

## Commit 與 Pull Request 準則
- 採 Conventional Commits（如 `feat:`、`fix:`、`docs:`）；標題不超過 72 字元，內文行長約 100 字元。
- PR 需摘要變更範圍、列出驗證指令、標註環境或設定異動；前端調整請附截圖或 GIF。
- 使用 `Closes #123` 連結 Issue；跨前後端的變更需同時邀請兩側維護者審查。

## 環境與憑證管理
- 將 `.env.example` 與 `google-credentials.json.example` 複製為實際檔案進行本機開發，嚴禁提交機密內容。
- 切換資料庫時執行 `cd server && npm run migrate:sqlite-to-postgres`，並於 `docs/` 與 `PROGRESS.md` 紀錄結果。
