# SuperMD · Copilot Instructions

## Architecture snapshot
- UI lives in `client/src` (React 18 + Vite + Tailwind). `components/layout/MainLayout.tsx` composes the editor, AI chat, and RAG panels with `react-resizable-panels`.
- Editor flow: `MarkdownEditor.tsx` wraps CodeMirror, pipes changes through `useAutoSave.ts` (2s debounce) into the authenticated REST layer (`documentAPI.update` → `/api/document/:id`).
- Sidebar flow: `components/sidebar/ProjectSidebar.tsx` pulls `projectAPI` + `documentAPI`, keeps optimistic state, and mirrors backend sorting (`updatedAt desc`). Keep payload shapes (`{ document }`, `{ projects }`) intact when extending services.
- Collaboration: `useCollaboration.ts` expects Socket.IO events `join-document`, `room-info`, `user-joined`, `user-left`, `sync-update`, `awareness-update`. Preserve these event names for compatibility.

## Backend & data
- `server/src/index.ts` boots Express + Socket.IO, mounts every route module; register new APIs there.
- Auth: `authMiddleware` injects `req.user`. All `/api/document*`, `/api/project*`, `/api/chat-history*`, `/api/rag/*`, `/api/upload-image` assume a valid JWT issued by `authService.ts` (bcrypt + Prisma). Frontend pushes the token via the axios interceptor in `client/src/services/api.ts`.
- Persistence: Core app uses Prisma + SQLite (`prisma/schema.prisma`, `DATABASE_URL=file:./dev.db`). Run `cd server && npx prisma migrate deploy` before first boot to sync schema.
- Agentic RAG: `services/ragService.ts` stores chunks in PostgreSQL + pgvector (`POSTGRES_URL` env) and caches searches via Redis. `initializePgVector()`/`initializeRedis()` fire on server start—expect warnings if services are down.
- Document export: `services/exportService.ts` embeds `/uploads` assets before handing off to @turbodocx/html-to-docx/jsPDF. Keep image URLs relative (`/uploads/images/...`) so exports can inline them.

## AI & research flows
 Chat modes share `useChat.ts`: REST chat (`/api/chat`) must return `{ message, sources? }`, RAG queries hit `/api/rag/query` (expects `{ answer, sources }`), research mode streams SSE (`/api/research/query`) sending `{ type, content }` chunks then a final `{ done: true, fullResponse, toolCalls, sources }` payload. Maintain這些 wire format，並記得在 SSE 模式下：
	 - 研究端點會穿插 `reasoning`（跑馬燈）、`tool_call`、`tool_result`、`chunk` 事件，最後推送 `[DONE]` 字串。
	 - Chat 串流 (`stream=true`) 只輸出 `{ chunk }`，你必須在前端解析 `[DONE]` 結束訊號並處理錯誤 payload（若 headers 已送出則改以 `data: { error }` 回傳）。
	 - 如需模擬測試可改用 `eventsource-parser` 對 stream split，再將事件注入 hook。
- `agents/researchAgent.ts` wires LangGraph ReAct with dynamic tools. When adding tools, emit human-friendly names so `ChatBotPanel` can surface them cleanly.
 Agentic RAG: `services/ragService.ts` stores chunks in PostgreSQL + pgvector (`POSTGRES_URL` env) and caches searches via Redis. `initializePgVector()`/`initializeRedis()` fire on server start—expect warnings if services are down。`rag_documents` 保存原文，`rag_embeddings` 保存 1536 維向量（IVFFlat index）。搜尋流程：Redis cache (key: `rag:search:<md5>`）→ miss 時算 query embedding → `SELECT ... ORDER BY embedding <=> $1::vector`。

- Install: `npm install` at repo root to pull both workspaces, or install per package.

## Phase 4 radar
- Prisma datasource 目標轉換為 PostgreSQL，請在修改前先匯出 SQLite `dev.db` 並寫好遷移腳本；更新 `.env`/docs 也務必同步 `PROGRESS.md`。
- 權限：善用 `DocumentPermission`，新增共用 helper（`canReadDocument`、`canEditDocument`），將檢查串入所有 `document/project/chatHistory` 路由與對應前端動作。
- 測試：後端建議使用 Vitest/Jest + Supertest；前端使用 Vitest + React Testing Library 模擬 SSE；E2E 以 Playwright 建立登入→編輯→串流→匯出流程，並在 CI (GitHub Actions) 啟動 postgres 服務。
- Redis / pgvector 失敗時必須 graceful fallback，必要時以 feature flag 控制，避免整個 RAG 查詢中斷。
- Builds: `npm run build` (root) chains `tsc` for backend and `vite build` for frontend. Backend uses `npm start` to execute `dist/index.js`.
- Env essentials (see `server/.env.example`, `RAG_SETUP.md`, `CREDENTIALS_SETUP.md`): `OPENAI_API_KEY`, optional `GOOGLE_APPLICATION_CREDENTIALS`, `POSTGRES_URL`, `REDIS_URL`, `JWT_SECRET`.

## Gotchas & conventions
- Keep TypeScript strictness: shared types live in `client/src/types/index.ts`; Prisma models enforce canonical field names (`projectId`, `lastEditedAt`).
- Auto-save uses document headings for titles—guard server updates against empty content and preserve `lastEditedAt` semantics.
- Image paste hits `/api/upload-image` and expects an auth token; responses must return `{ url }` that the editor rewrites directly into markdown.
- Legacy in-memory routes (`routes/documents.ts`) still exist for reference but new work should target the Prisma-backed `routes/document.ts` + `project.ts` pair.
- Progress and feature context lives in `PROGRESS.md`, `ADVANCED_RAG_FEATURES.md`, `RAG_SETUP.md`, and the Phase 4 spike notes at `docs/phase-4-spike.md`; skim them before large refactors.

- Do Not Shutdown Non-project npm, only server and client npm can shutdown.

Let me know if any section feels thin or if you need deeper call-outs for specific subsystems.
