# 🔧 SuperMD 環境設置指南

> **目的**：解決 Redis 和 PgVector 初始化問題
> **狀態**：⚠️ 需要配置

---

## ⚠️ 當前問題診斷

你看到的錯誤訊息：
```
⚠️  Redis not available, caching will be disabled
   To enable caching, start Redis: docker run -d -p 6379:6379 redis:alpine

⚠️  PgVector initialization failed. RAG features may not work.
   Make sure PostgreSQL is running with pgvector extension installed.
```

**根本原因**：
1. ❌ `.env` 文件未配置或缺少必要變數
2. ❌ Redis 服務未啟動
3. ❌ PostgreSQL 未安裝 pgvector 擴展

---

## 🎯 解決方案（3 個選項）

### **選項 1：完整設置（推薦用於生產）**

適合：想要完整體驗所有功能（RAG + 快取）

#### 步驟 1：創建 .env 文件
```bash
cd D:\Test\SuperMD\server
cp .env.example .env
```

#### 步驟 2：編輯 .env
```bash
# 基本配置
PORT=3000
NODE_ENV=development

# 主資料庫（Prisma 使用）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supermd"

# RAG 資料庫（pgvector 使用，可與 DATABASE_URL 相同）
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/supermd"

# Redis 快取（可選）
REDIS_URL="redis://localhost:6379"

# OpenAI API
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Google Search（可選）
# GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
# GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

#### 步驟 3：啟動 PostgreSQL + pgvector
```bash
# 使用 Docker（最簡單）
docker run -d \
  --name supermd-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=supermd \
  -p 5432:5432 \
  ankane/pgvector:latest

# 驗證安裝
docker exec -it supermd-postgres psql -U postgres -d supermd -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### 步驟 4：啟動 Redis
```bash
# 使用 Docker
docker run -d \
  --name supermd-redis \
  -p 6379:6379 \
  redis:alpine

# 驗證運行
docker exec -it supermd-redis redis-cli ping
# 應該返回：PONG
```

#### 步驟 5：初始化資料庫
```bash
cd D:\Test\SuperMD\server
npx prisma migrate deploy
npx prisma generate
```

#### 步驟 6：啟動服務
```bash
npm run dev
```

**預期輸出**：
```
✅ Redis: Connected
✅ Redis: Ready
🚀 Redis initialized successfully
✅ PgVector initialized successfully
🚀 Server running on http://localhost:3000
```

---

### **選項 2：無 Docker 設置（手動安裝）**

適合：不想用 Docker 的開發者

#### PostgreSQL 安裝（Windows）
```bash
# 下載並安裝 PostgreSQL 15+
# https://www.postgresql.org/download/windows/

# 安裝 pgvector 擴展
# 1. 下載預編譯的 pgvector.dll
# https://github.com/pgvector/pgvector/releases

# 2. 放入 PostgreSQL 的 lib 目錄
# 通常在：C:\Program Files\PostgreSQL\15\lib

# 3. 在資料庫中啟用
psql -U postgres -d supermd
CREATE EXTENSION vector;
```

#### Redis 安裝（Windows）
```bash
# 選項 A：使用 WSL2
wsl --install
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# 選項 B：使用 Memurai（Windows 原生 Redis）
# https://www.memurai.com/get-memurai
```

---

### **選項 3：最小配置（僅核心功能）**

適合：只想快速測試，不需要 RAG 功能

#### 步驟 1：創建 .env（最小配置）
```bash
PORT=3000
NODE_ENV=development

# 使用 SQLite（無需 PostgreSQL）
DATABASE_URL="file:./dev.db"

# OpenAI API
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini

# JWT
JWT_SECRET=dev-secret-key
```

#### 步驟 2：修改 Prisma Schema
```bash
# 編輯 server/prisma/schema.prisma
datasource db {
  provider = "sqlite"  # 改為 sqlite
  url      = env("DATABASE_URL")
}
```

#### 步驟 3：初始化 SQLite
```bash
cd D:\Test\SuperMD\server
npx prisma migrate deploy
npx prisma generate
```

#### 步驟 4：啟動（跳過 RAG）
```bash
npm run dev
```

**注意**：
- ⚠️ RAG 功能將無法使用
- ⚠️ Redis 快取將被禁用
- ✅ Chat 和 Research 模式正常
- ✅ 基本文件編輯正常

---

## 🔍 驗證設置

### 檢查 PostgreSQL 連接
```bash
# 方法 1：使用 psql
psql -U postgres -h localhost -d supermd -c "SELECT version();"

# 方法 2：使用程式
node -e "const { Pool } = require('pg'); const pool = new Pool({connectionString: 'postgresql://postgres:postgres@localhost:5432/supermd'}); pool.query('SELECT NOW()').then(r => console.log('✅ Connected:', r.rows[0])).catch(e => console.error('❌ Error:', e));"
```

### 檢查 pgvector 擴展
```bash
psql -U postgres -d supermd -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### 檢查 Redis 連接
```bash
# 方法 1：使用 redis-cli
redis-cli ping

# 方法 2：使用程式
node -e "const redis = require('redis'); const client = redis.createClient({url: 'redis://localhost:6379'}); client.connect().then(() => {console.log('✅ Connected'); client.quit();}).catch(e => console.error('❌ Error:', e));"
```

---

## 📊 功能可用性矩陣

| 功能 | SQLite | PostgreSQL | PostgreSQL + Redis | PostgreSQL + pgvector + Redis |
|------|--------|------------|-------------------|-------------------------------|
| **基本編輯** | ✅ | ✅ | ✅ | ✅ |
| **Chat 模式** | ✅ | ✅ | ✅ | ✅ |
| **Research 模式** | ✅ | ✅ | ✅ | ✅ |
| **RAG 模式** | ❌ | ❌ | ❌ | ✅ |
| **RAG 快取** | ❌ | ❌ | ✅ | ✅ |
| **多用戶協作** | ⚠️ | ✅ | ✅ | ✅ |

---

## 🐛 常見問題排除

### Q1: PostgreSQL 連接失敗
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決**：
```bash
# 檢查 PostgreSQL 是否運行
# Windows
sc query postgresql-x64-15

# Docker
docker ps | grep postgres

# 啟動服務
docker start supermd-postgres
```

### Q2: pgvector 擴展錯誤
```
Error: extension "vector" does not exist
```

**解決**：
```bash
# 手動創建擴展
docker exec -it supermd-postgres psql -U postgres -d supermd
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### Q3: Redis 連接超時
```
Error: Redis connection timeout
```

**解決**：
```bash
# 檢查 Redis 是否運行
docker ps | grep redis

# 啟動 Redis
docker start supermd-redis

# 測試連接
redis-cli -h localhost -p 6379 ping
```

### Q4: .env 變數未載入
```
Error: OPENAI_API_KEY is not defined
```

**解決**：
```bash
# 確認 .env 文件位置
cd D:\Test\SuperMD\server
ls -la .env

# 重啟服務
npm run dev
```

---

## 🚀 快速啟動腳本

### 一鍵啟動所有服務（Docker）
```bash
# 創建 docker-compose.yml（位於 SuperMD/）
version: '3.8'
services:
  postgres:
    image: ankane/pgvector:latest
    container_name: supermd-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: supermd
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    container_name: supermd-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

**使用方式**：
```bash
cd D:\Test\SuperMD

# 啟動所有服務
docker-compose up -d

# 檢查狀態
docker-compose ps

# 停止所有服務
docker-compose down

# 查看日誌
docker-compose logs -f
```

---

## 📝 環境變數完整參考

```bash
# ==================== 必需 ====================
PORT=3000                                    # 服務端口
DATABASE_URL="postgresql://..."              # Prisma 資料庫
OPENAI_API_KEY=sk-xxx                       # OpenAI API Key
JWT_SECRET=your-secret-key                   # JWT 密鑰

# ==================== RAG 功能 ====================
POSTGRES_URL="postgresql://..."              # pgvector 資料庫（可與 DATABASE_URL 相同）
REDIS_URL="redis://localhost:6379"          # Redis 快取（可選，提升效能）

# ==================== AI 模型 ====================
OPENAI_MODEL=gpt-4o-mini                    # 默認模型

# ==================== Google Search（可選）====================
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_SEARCH_ENGINE_ID=your-engine-id

# ==================== 開發環境 ====================
NODE_ENV=development                         # development | production
```

---

## ✅ 驗證清單

啟動服務前，確認：

- [ ] `.env` 文件已創建並配置
- [ ] PostgreSQL 服務運行中（`docker ps` 或 `sc query postgresql-x64-15`）
- [ ] Redis 服務運行中（可選）
- [ ] pgvector 擴展已安裝（`SELECT * FROM pg_extension WHERE extname = 'vector';`）
- [ ] Prisma 已初始化（`npx prisma generate`）
- [ ] OpenAI API Key 有效

---

## 🎯 推薦配置

**開發環境**：選項 1（Docker 完整設置）
- 快速啟動
- 一致性環境
- 所有功能可用

**生產環境**：選項 1 或 2（手動安裝）
- 更好的效能控制
- 專用伺服器
- 完整監控

**快速測試**：選項 3（最小配置）
- 無需額外服務
- 快速驗證核心功能

---

**最後更新**: 2025-10-18
**維護者**: SuperMD Team
