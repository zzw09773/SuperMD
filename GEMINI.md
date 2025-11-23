# SuperMD 專案背景

## 專案概述
SuperMD 是一個現代化的協作 Markdown 編輯器，具備雙模式 AI 助手（聊天與研究）、即時協作功能，以及智能 RAG（檢索增強生成）能力。

- **前端 (Frontend):** React 18, Vite, CodeMirror 6, Tailwind CSS, Y.js (基於 CRDT 的協作)。
- **後端 (Backend):** Node.js, Express, Socket.IO, Prisma (ORM), LangChain/LangGraph (AI 代理)。
- **資料庫 (Database):** PostgreSQL (搭配 `pgvector` 進行向量搜尋), Redis (快取)。
- **AI 功能:**
    - **聊天 (Chat):** 具備記憶功能的上下文對話。
    - **研究 (Research):** 使用 Google Search、Wikipedia 等工具的 Agentic 工作流。
    - **RAG:** 支援多種檔案格式的文件索引與語意搜尋。

## 目錄結構
- **SuperMD/**: 專案根目錄。
    - **client/**: React 前端應用程式。
    - **server/**: Express 後端應用程式與 AI Agents。
    - **docker-compose.yml**: PostgreSQL 和 Redis 的 Docker 配置。
    - **.env**: 環境變數（位於 `server/` 目錄下）。

## 設定與開發

### 前置需求
- Node.js 18+
- PostgreSQL 15+ (需安裝 pgvector 擴充功能)
- OpenAI API Key

### 安裝步驟
1.  **Clone 並安裝依賴套件:**
    ```bash
    # 安裝根目錄依賴
    npm install
    
    # 安裝前端依賴
    cd client && npm install
    
    # 安裝後端依賴
    cd ../server && npm install
    ```

2.  **環境配置:**
    - 複製 `server/.env.example` 建立 `server/.env`。
    - 設定 `OPENAI_API_KEY`、`POSTGRES_URL` 及其他服務設定。

3.  **資料庫設定:**
    ```bash
    cd server
    npx prisma migrate dev
    npx prisma generate
    ```

### 執行專案
- **開發模式 (同時啟動):**
    ```bash
    npm run dev
    ```
    這將在 port 3000 啟動後端，在 port 5173 啟動前端。

- **個別服務:**
    ```bash
    npm run dev:server  # 僅啟動後端
    npm run dev:client  # 僅啟動前端
    ```

### 建置 (Building)
- **完整建置:** `npm run build`
- **後端建置:** `npm run build:server`
- **前端建置:** `npm run build:client`

### 測試 (Testing)
- **後端:** `cd server && npm test` (使用 Vitest)
- **前端:** `cd client && npm test`

## 開發規範
- **語言:** 全端皆使用 TypeScript。
- **風格:** 已配置 ESLint 和 Prettier。
- **Commit:** 遵循 Conventional Commits 規範。
- **文件:** `README.md` 包含詳細的繁體中文說明。
- **AI/Agents:** 位於 `server/src/agents/`，使用 LangGraph 框架。
- **資料庫:** Schema 定義於 `server/prisma/schema.prisma`。

## 關鍵檔案
- `SuperMD/package.json`: 工作區腳本 (Workspace scripts)。
- `SuperMD/client/vite.config.ts`: 前端建置設定。
- `SuperMD/server/src/index.ts`: 後端入口點。
- `SuperMD/server/src/config/aiConfig.ts`: AI 模型設定。
- `SuperMD/server/prisma/schema.prisma`: 資料庫 Schema 定義。