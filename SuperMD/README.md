# SuperMD

一個現代化的協作 Markdown 編輯器，具備雙模式 AI 助手、即時協作和智能知識庫檢索功能。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ 核心功能

### 📝 智能編輯器
- **CodeMirror 6** 強大的 Markdown 編輯體驗
- **即時預覽** 分割視圖，所見即所得
- **自動儲存** 3 秒防抖，雲端同步
- **Markdown 自動完成** 30+ 預設片段（標題、格式、程式碼）
- **多格式匯出** MD / HTML / PDF / DOCX / TXT

### 🤖 三模式 AI 助手

#### 💬 Chat 模式
- 快速對話（GPT-4o-mini）
- 完整對話記憶管理
- 支援串流回應

#### 🔍 Research 模式
- **LangGraph ReAct Agent** 深度研究
- **10+ 智能工具**：
  - Google 搜尋（官方 API）
  - Wikipedia / arXiv / Stack Overflow / GitHub
  - 計算機、文件搜尋、翻譯、程式碼說明
- **可視化推理過程** 即時顯示思考步驟
- **自動來源引用** 追蹤資訊來源

#### 🧠 RAG 模式（知識庫查詢）
- **Agentic RAG** 智能檢索增強生成
- **支援 13 種檔案格式**：
  - 文件：PDF, DOCX, TXT, MD
  - 圖片：PNG, JPG（OCR 文字提取）
  - 表格：CSV, XLSX
  - 程式碼：JS, TS, PY, Java, C++, Go, Rust 等
- **向量搜尋**：pgvector + IVFFlat 索引
- **記憶管理**：自動壓縮與 LLM 摘要
- **Redis 快取**：加速查詢回應

### 👥 即時協作
- **Y.js CRDT** 衝突自由的協作編輯
- **Socket.IO** 即時同步
- **在線狀態** 顯示協作用戶數量

### 📁 專案管理
- **ChatGPT 風格側邊欄** 直覺的文件組織
- **專案分組** 拖曳式文件管理
- **資料夾結構** 層次化文件管理

---

## 🚀 快速開始

### 前置需求

- **Node.js** 18+ ([下載](https://nodejs.org/))
- **PostgreSQL** 15+ with pgvector ([安裝指南](#postgresql-設定))
- **OpenAI API Key** ([取得](https://platform.openai.com/api-keys))
- **Redis** (可選，用於 RAG 快取) ([安裝](https://redis.io/download))

### 1. 安裝依賴

```bash
# Clone 專案
git clone https://github.com/your-repo/SuperMD.git
cd SuperMD

# 安裝根目錄依賴
npm install

# 安裝前端依賴
cd client && npm install

# 安裝後端依賴
cd ../server && npm install
```

### 2. 環境配置

建立 `server/.env` 檔案：

```bash
# 複製範例配置
cd server
cp .env.example .env
```

編輯 `.env`：

```bash
# Server
PORT=3000

# Database (Prisma - 用於文件管理)
DATABASE_URL="file:./dev.db"

# PostgreSQL (用於 RAG 向量搜尋，可選)
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/supermd_rag"

# Redis (可選，用於 RAG 快取)
REDIS_URL="redis://localhost:6379"

# OpenAI API (必須)
OPENAI_API_KEY="sk-your-api-key-here"
OPENAI_MODEL="gpt-4o-mini"

# JWT 密鑰
JWT_SECRET="your-super-secret-jwt-key"

# Google Custom Search (可選，用於 Research 模式)
GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
GOOGLE_SEARCH_ENGINE_ID="your-search-engine-id"
```

### 3. 資料庫初始化

```bash
cd server

# 執行 Prisma 遷移
npx prisma migrate dev

# 生成 Prisma Client
npx prisma generate
```

### 4. 啟動開發伺服器

```bash
# 從專案根目錄同時啟動前後端
npm run dev

# 或分別啟動
npm run dev:server  # 後端 (port 3000)
npm run dev:client  # 前端 (port 5173)
```

### 5. 訪問應用

- **前端**: http://localhost:5173
- **後端 API**: http://localhost:3000
- **Prisma Studio**: `npx prisma studio` (port 5555)

---

## 📦 PostgreSQL 設定

### 安裝 PostgreSQL + pgvector

#### 使用 Docker（推薦）

```bash
# 啟動 PostgreSQL 與 pgvector
docker run -d \
  --name supermd-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=supermd_rag \
  -p 5432:5432 \
  pgvector/pgvector:pg15

# 啟動 Redis (可選)
docker run -d \
  --name supermd-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### 手動安裝

1. 安裝 PostgreSQL 15+
2. 安裝 pgvector 擴展：
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. 創建資料庫：
   ```sql
   CREATE DATABASE supermd_rag;
   ```

### 驗證安裝

```bash
# 測試連線
psql -U postgres -d supermd_rag -c "SELECT 1;"

# 檢查 pgvector 擴展
psql -U postgres -d supermd_rag -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

---

## 🛠️ 開發指令

### 執行與建置

```bash
# 開發模式（熱重載）
npm run dev              # 同時啟動前後端
npm run dev:server       # 只啟動後端
npm run dev:client       # 只啟動前端

# 建置生產版本
npm run build            # 建置前後端
npm run build:server     # 只建置後端
npm run build:client     # 只建置前端

# 啟動生產伺服器
npm start                # 執行建置後的後端
```

### 測試與品質檢查

```bash
# 執行測試
cd server && npm test
cd client && npm test

# Lint 檢查
cd server && npm run lint
cd client && npm run lint

# TypeScript 型別檢查
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```

### 資料庫管理

```bash
cd server

# Prisma 操作
npx prisma studio            # 開啟資料庫 GUI
npx prisma migrate dev       # 建立並套用遷移
npx prisma migrate reset     # 重置資料庫
npx prisma generate          # 重新生成 Prisma Client

# SQLite → PostgreSQL 遷移
npm run migrate:sqlite-to-postgres
```

---

## 📚 技術架構

### 前端技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 18.2 | UI 框架 |
| TypeScript | 5.0 | 型別安全 |
| Vite | 5.0 | 建置工具 |
| CodeMirror 6 | - | Markdown 編輯器 |
| Tailwind CSS | 3.4 | 樣式框架 |
| Socket.IO Client | 4.7 | 即時通訊 |
| Y.js | 13.6 | CRDT 協作 |
| Axios | 1.6 | HTTP 請求 |

### 後端技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 執行環境 |
| Express | 4.18 | Web 框架 |
| TypeScript | 5.0 | 型別安全 |
| Prisma | 5.9 | ORM |
| Socket.IO | 4.7 | WebSocket |
| LangChain | 0.3 | AI 框架 |
| LangGraph | 0.4 | Agent 編排 |
| PostgreSQL | 15+ | 資料庫 |
| pgvector | 0.7 | 向量搜尋 |
| Redis | 7+ | 快取層 |

### AI 模型

| 模型 | 用途 | Token 限制 |
|------|------|------------|
| gpt-4o-mini | Chat / Research | 128K context |
| text-embedding-3-small | RAG 向量化 | 8K input, 1536 dim |

---

## 🏗️ 專案結構

```
SuperMD/
├── client/                 # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/    # React 組件
│   │   │   ├── chat/      # AI 聊天面板
│   │   │   ├── editor/    # Markdown 編輯器
│   │   │   ├── layout/    # 佈局組件
│   │   │   └── rag/       # RAG 文件管理
│   │   ├── hooks/         # 自訂 Hooks
│   │   ├── services/      # API 服務
│   │   ├── types/         # TypeScript 類型
│   │   └── main.tsx       # 入口文件
│   └── package.json
│
├── server/                # 後端 (Express + TypeScript)
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 業務邏輯
│   │   ├── agents/        # LangGraph Agents
│   │   ├── lib/           # 工具函式
│   │   ├── middleware/    # Express 中介層
│   │   └── index.ts       # 入口文件
│   ├── prisma/
│   │   └── schema.prisma  # 資料庫 Schema
│   └── package.json
│
├── package.json           # Root 依賴
├── CLAUDE.md             # Claude Code 指南
└── README.md             # 本文件
```

---

## 🎯 API 端點

### 認證

- `POST /api/auth/register` - 註冊新用戶
- `POST /api/auth/login` - 用戶登入

### 文件管理

- `GET /api/documents` - 獲取文件列表
- `GET /api/document/:id` - 獲取單一文件
- `POST /api/document` - 建立新文件
- `PATCH /api/document/:id` - 更新文件
- `DELETE /api/document/:id` - 刪除文件

### 專案管理

- `GET /api/projects` - 獲取專案列表
- `POST /api/projects` - 建立專案
- `PATCH /api/projects/:id` - 更新專案
- `DELETE /api/projects/:id` - 刪除專案

### AI 助手

- `POST /api/chat` - Chat 模式對話
- `GET /api/research/query` - Research 模式（SSE 串流）
- `POST /api/rag/query` - RAG 知識庫查詢
- `GET /api/rag/query-stream` - RAG 串流查詢（SSE）

### RAG 文件管理

- `POST /api/rag/upload` - 上傳文件到向量資料庫
- `GET /api/rag/documents` - 獲取已索引文件
- `DELETE /api/rag/documents/:id` - 刪除索引文件

### 聊天記錄

- `GET /api/chat-history/:documentId` - 獲取聊天記錄
- `POST /api/chat-history/:documentId` - 儲存訊息
- `DELETE /api/chat-history/:documentId` - 清除記錄

### 匯出

- `POST /api/export` - 匯出文件（MD/HTML/PDF/DOCX/TXT）

---

## 🔧 進階配置

### Google Custom Search 設定（Research 模式）

1. **建立 Google Cloud 專案**
   - 訪問 [Google Cloud Console](https://console.cloud.google.com/)
   - 建立新專案

2. **啟用 Custom Search API**
   - 在 API 庫中搜尋 "Custom Search API"
   - 點擊啟用

3. **建立服務帳戶**
   - 導航至「IAM 與管理」→「服務帳戶」
   - 建立新服務帳戶
   - 下載 JSON 金鑰檔案

4. **建立自訂搜尋引擎**
   - 訪問 [Programmable Search Engine](https://programmablesearchengine.google.com/)
   - 建立新的搜尋引擎
   - 啟用「搜尋整個網路」
   - 複製 Search Engine ID

5. **配置環境變數**
   ```bash
   # server/.env
   GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
   GOOGLE_SEARCH_ENGINE_ID="your-search-engine-id"
   ```

### Redis 快取配置

```bash
# server/.env
REDIS_URL="redis://localhost:6379"

# 可選參數
REDIS_TTL=3600  # 快取時間（秒）
```

### Agent Memory 配置

```bash
# server/.env
AGENT_MEMORY_MAX_TOKENS=1600    # 記憶上限
AGENT_MEMORY_TARGET_TOKENS=1200 # 壓縮目標
```

---

## 🐛 故障排除

### PostgreSQL 連線失敗

**症狀**: `database "supermd_rag" does not exist`

**解決方案**:
1. 檢查 PostgreSQL 是否正在運行
2. 確認 `POSTGRES_URL` 環境變數正確
3. 手動建立資料庫：
   ```sql
   CREATE DATABASE supermd_rag;
   CREATE EXTENSION vector;
   ```

### Research 功能失敗

**症狀**: "Research failed. Please try again."

**可能原因**:
1. **PostgreSQL 未配置** - Agent Memory 需要 PostgreSQL
   - 解決：配置 PostgreSQL 或系統會自動降級（無記憶模式）
2. **Google Search 未配置** - 檢查 `.env` 配置
3. **OpenAI API 錯誤** - 檢查 API Key 和額度

**檢查方式**:
```bash
# 檢查 Research 狀態
curl http://localhost:3000/api/research/status

# 查看詳細錯誤（瀏覽器 Console）
# 會顯示具體錯誤訊息
```

### RAG 上傳失敗

**症狀**: 檔案上傳後無法查詢

**檢查清單**:
1. ✅ PostgreSQL + pgvector 已安裝
2. ✅ `POSTGRES_URL` 環境變數正確
3. ✅ 檔案格式支援（見下方列表）

**支援格式**:
- 文件：PDF, DOCX, TXT, MD
- 圖片：PNG, JPG, JPEG, GIF, BMP, TIFF, WebP
- 表格：CSV, XLS, XLSX
- 程式碼：JS, TS, PY, Java, C++, Go, Rust, Ruby, PHP 等

### 前端無法連接後端

**症狀**: Network Error / CORS Error

**解決方案**:
1. 確認後端運行在 `http://localhost:3000`
2. 檢查前端配置（`client/src/services/api.ts`）
3. 清除瀏覽器快取

---

## 📈 效能優化

### 前端

- **Code Splitting** - Vite 自動分割
- **Lazy Loading** - React.lazy() 延遲載入
- **Auto-save Debounce** - 3 秒防抖減少請求
- **Resizable Panels** - 防止不必要的 re-render

### 後端

- **SSE Streaming** - 即時串流回應（Research/Chat）
- **Batch Processing** - RAG 大檔案分批處理
- **PostgreSQL Indexes** - userId, projectId, lastEditedAt
- **IVFFlat Vector Index** - 快速向量搜尋
- **Redis Caching** - RAG 搜尋結果快取（1 小時 TTL）
- **Connection Pooling** - pg 庫連線池

---

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發流程

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 程式碼規範

- **TypeScript Strict Mode** - 強制型別檢查
- **ESLint** - 遵循 Airbnb 風格
- **Prettier** - 自動格式化
- **Commit Message** - 使用 Conventional Commits

---

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

---

## 🙏 致謝

- [OpenAI](https://openai.com/) - GPT 模型與 Embeddings
- [LangChain](https://www.langchain.com/) - AI 應用框架
- [CodeMirror](https://codemirror.net/) - 強大的編輯器
- [Yjs](https://github.com/yjs/yjs) - CRDT 協作引擎
- [pgvector](https://github.com/pgvector/pgvector) - PostgreSQL 向量擴展

---

## 📞 聯絡方式

- **Issues**: [GitHub Issues](https://github.com/your-repo/SuperMD/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/SuperMD/discussions)

---

**Built with ❤️ using React, TypeScript, and LangChain**
