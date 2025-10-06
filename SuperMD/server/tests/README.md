# Server Test Skeleton (Phase 4)

> 這是 Phase 4 Spike 的一部分：描述預定的測試骨架與套件需求。尚未引入所有依賴，請依下方步驟規劃後續工作。

## 套件建議

- `vitest`：單元與整合測試框架。
- `supertest`：測試 Express 路由與 SSE 端點。
- `@vitest/ui`（可選）：本地互動式除錯。
- `cross-env` 或 `dotenv`：設定測試環境變數。
- （未來）`testcontainers`：在測試中啟動 PostgreSQL / Redis。

## 目錄結構

```
server/
  tests/
    helpers/
      prismaTestEnv.ts      # 建立 Prisma 測試環境、交易、資料清除
      sseClient.ts          # 封裝 SSE 測試邏輯
    auth.test.ts            # 基本登入 / JWT 驗證
    documents.test.ts       # CRUD + 權限守衛
    chat.sse.test.ts        # GPT-5 串流（mock OpenAI）
    research.sse.test.ts    # LangGraph SSE（mock tools）
```

> ⏳ 目前僅有計畫，待安裝依賴與撰寫測試後再提交。

## 指令草案

- `npm run test` → `vitest --run`
- `npm run test:watch` → `vitest`
- `npm run test:e2e` → 未來 Playwright 指令（暫定）

## 待辦清單

- [ ] 安裝 `vitest`, `supertest`, `@vitejs/plugin-react`, `@rollup/plugin-node-resolve` 等必要依賴。
- [ ] 建立 `vitest.config.ts`，設定 `test` 環境與別名。
- [ ] 撰寫 `helpers/prismaTestEnv.ts`（啟動交易 / SQLite in-memory）。
- [ ] 實作 `chat.sse.test.ts`：mock OpenAI 串流、驗證 `[DONE]` 與錯誤處理。
- [ ] 實作 `research.sse.test.ts`：mock LangGraph stream、測試工具事件。
- [ ] 將測試流程加入 CI（GitHub Actions）。

---

如需更完整的 Spike 筆記，請參考 `docs/phase-4-spike.md`。