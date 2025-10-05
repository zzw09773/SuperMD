# SuperMD RAG - Docker PostgreSQL 快速設置指南

## ✅ 已完成設置

您的 SuperMD Agentic RAG 系統已成功配置並運行！

### 當前狀態

✅ **PostgreSQL + pgvector** - 運行在 Docker 容器中
✅ **向量索引** - 已初始化並測試成功
✅ **RAG API** - 上傳、查詢功能正常
✅ **GPT-5 整合** - temperature=1 配置完成

---

## 🐳 Docker PostgreSQL 設置

### 1. 容器資訊

```bash
容器名稱: supermd-postgres
映像: pgvector/pgvector:pg16
端口: 5432:5432
資料庫: supermd_rag
用戶名: postgres
密碼: postgres
```

### 2. 常用 Docker 指令

```bash
# 查看容器狀態
docker ps | grep supermd-postgres

# 查看容器日誌
docker logs supermd-postgres

# 停止容器
docker stop supermd-postgres

# 啟動容器
docker start supermd-postgres

# 重啟容器
docker restart supermd-postgres

# 刪除容器（注意：會刪除所有數據）
docker rm -f supermd-postgres

# 進入 PostgreSQL Shell
docker exec -it supermd-postgres psql -U postgres -d supermd_rag
```

### 3. 數據持久化

數據儲存在 Docker Volume 中：
```bash
# 查看 volumes
docker volume ls | grep supermd

# 查看 volume 詳細信息
docker volume inspect supermd-pgdata

# 備份數據（重要！）
docker exec supermd-postgres pg_dump -U postgres supermd_rag > backup.sql

# 恢復數據
cat backup.sql | docker exec -i supermd-postgres psql -U postgres -d supermd_rag
```

---

## 🚀 完整重新部署步驟

如果需要從頭開始：

```bash
# 1. 停止並刪除舊容器
docker stop supermd-postgres
docker rm supermd-postgres
docker volume rm supermd-pgdata

# 2. 啟動新容器
docker run -d \
  --name supermd-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=supermd_rag \
  -p 5432:5432 \
  -v supermd-pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

# 3. 等待容器啟動（約 3-5 秒）
sleep 5

# 4. 初始化 pgvector 擴展
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. 驗證
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

---

## 📊 資料庫 Schema

### Tables

#### `rag_documents`
```sql
CREATE TABLE rag_documents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rag_embeddings`
```sql
CREATE TABLE rag_embeddings (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES rag_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector similarity index
CREATE INDEX rag_embeddings_embedding_idx
  ON rag_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 🧪 測試 RAG 系統

### 1. 上傳文件
```bash
# 登入獲取 token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@supermd.com","password":"password123"}' | jq -r '.token')

# 上傳文件
curl -X POST http://localhost:3000/api/rag/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@your-document.pdf"
```

### 2. 查詢知識庫
```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"這個文件的主要內容是什麼？"}'
```

### 3. 查看已索引文件
```bash
curl -X GET http://localhost:3000/api/rag/documents \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 疑難排解

### 問題 1: 容器無法啟動
```bash
# 檢查端口是否被占用
netstat -ano | findstr :5432

# 如果被占用，停止其他 PostgreSQL 服務或更改端口
docker run -d ... -p 5433:5432 ...  # 使用 5433 端口
```

### 問題 2: pgvector 擴展未安裝
```bash
# 手動安裝
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "CREATE EXTENSION vector;"

# 驗證
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "\dx"
```

### 問題 3: 數據丟失
```bash
# 檢查 volume 是否存在
docker volume ls | grep supermd-pgdata

# 如果不存在，需要重新創建並恢復備份
docker volume create supermd-pgdata
cat backup.sql | docker exec -i supermd-postgres psql -U postgres -d supermd_rag
```

### 問題 4: 連接被拒絕
```bash
# 檢查容器狀態
docker ps -a | grep supermd-postgres

# 查看容器日誌
docker logs supermd-postgres

# 重啟容器
docker restart supermd-postgres
```

---

## 📈 監控與維護

### 查看資料庫大小
```bash
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "
  SELECT pg_size_pretty(pg_database_size('supermd_rag')) as db_size;
"
```

### 查看文件數量
```bash
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "
  SELECT COUNT(*) as total_documents FROM rag_documents;
"
```

### 查看向量數量
```bash
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "
  SELECT COUNT(*) as total_embeddings FROM rag_embeddings;
"
```

### 清理舊數據
```bash
# 刪除超過 30 天的文件
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "
  DELETE FROM rag_documents
  WHERE created_at < NOW() - INTERVAL '30 days';
"
```

---

## 🎯 生產環境建議

1. **修改預設密碼**
   ```bash
   docker exec -it supermd-postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'your-strong-password';"
   ```

2. **定期備份**
   ```bash
   # 設置每日自動備份（Windows Task Scheduler 或 cron）
   docker exec supermd-postgres pg_dump -U postgres supermd_rag > backup_$(date +%Y%m%d).sql
   ```

3. **資源限制**
   ```bash
   docker update --memory="2g" --cpus="1.5" supermd-postgres
   ```

4. **監控日誌**
   ```bash
   docker logs -f supermd-postgres
   ```

---

## 📝 環境變數

在 `.env` 文件中的配置：
```env
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/supermd_rag"
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-5"
```

---

## ✅ 成功測試記錄

**測試日期**: 2025-10-05
**測試文件**: test-document.txt (803 bytes)
**索引結果**: ✅ 1 document, 1 embedding chunk
**查詢測試**: ✅ 成功回答定價方案問題
**模型**: GPT-5 (temperature=1)

**測試查詢與回答**:
- **問題**: "SuperMD 的定價方案有哪些？"
- **回答**: "根據 Source 1（test-document.txt），SuperMD 的定價方案如下：
  - 免費版：基本編輯功能
  - 專業版：$9.99/月，包含 AI 助手
  - 企業版：$29.99/月，包含 RAG 知識庫和無限儲存"
- **來源**: test-document.txt

---

## 🔗 相關文檔

- [RAG 設置指南](./RAG_SETUP.md) - 詳細的 RAG 系統說明
- [API 文檔](./API_DOCS.md) - API 端點參考
- [pgvector 官方文檔](https://github.com/pgvector/pgvector)
- [LangChain 文檔](https://js.langchain.com/)

---

**🎉 恭喜！您的 SuperMD Agentic RAG 系統已成功運行！**
