# SuperMD Agentic RAG Setup Guide

## 概述

SuperMD 現在支援 **Agentic RAG（Retrieval-Augmented Generation）**系統，使用 ReAct Agent 架構整合：
- **知識庫檢索**：從用戶上傳的文件中搜尋相關資訊
- **網路搜尋**：當知識庫不足時，從 Google 搜尋補充資訊
- **智能決策**：Agent 自動決定使用哪個工具來回答問題

## 前置需求

### 1. 安裝 PostgreSQL

**Windows:**
```bash
# 下載並安裝 PostgreSQL
# https://www.postgresql.org/download/windows/

# 或使用 Chocolatey
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. 安裝 pgvector Extension

```bash
# 連接到 PostgreSQL
psql -U postgres

# 創建資料庫
CREATE DATABASE supermd_rag;

# 連接到資料庫
\c supermd_rag

# 安裝 pgvector extension
CREATE EXTENSION vector;

# 驗證安裝
SELECT * FROM pg_extension WHERE extname = 'vector';

# 退出
\q
```

**如果 pgvector 尚未安裝：**

```bash
# Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# macOS
brew install pgvector

# 從源碼編譯 (所有平台)
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

### 3. 配置環境變數

在 `SuperMD/server/.env` 中已配置：

```env
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/supermd_rag"
```

請根據您的設置修改用戶名、密碼和端口。

## 系統架構

### Backend Components

1. **文件解析器** (`fileParser.ts`)
   - 支援 PDF, DOCX, TXT, Markdown
   - 提取文本內容和元數據

2. **向量嵌入服務** (`ragService.ts`)
   - 使用 OpenAI `text-embedding-3-small` 模型
   - 文本分塊（chunk size: 1000, overlap: 200）
   - 向量儲存和相似度搜尋

3. **Agentic RAG** (`agenticRAG.ts`)
   - **ReAct Agent** 架構
   - **Tools**:
     - `knowledge_base_search`: 搜尋用戶上傳的文件
     - `web_search`: Google 網路搜尋
   - 自動決策使用哪個工具

4. **API Routes** (`rag.ts`)
   - `POST /api/rag/upload`: 上傳文件並建立向量索引
   - `GET /api/rag/documents`: 獲取已索引的文件列表
   - `DELETE /api/rag/documents/:id`: 刪除文件
   - `POST /api/rag/search`: 向量搜尋（僅檢索）
   - `POST /api/rag/query`: **Agentic RAG 查詢**（ReAct Agent）

## API 使用範例

### 1. 上傳文件並建立索引

```bash
curl -X POST http://localhost:3000/api/rag/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

### 2. 使用 Agentic RAG 查詢

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "請問文件中提到的主要概念是什麼？"}'
```

**回應範例:**
```json
{
  "query": "請問文件中提到的主要概念是什麼？",
  "answer": "根據知識庫中的文件，主要概念包括...",
  "sources": ["document.pdf", "report.docx"],
  "steps": [
    {
      "tool": "knowledge_base_search",
      "input": "主要概念",
      "output": "Source 1: document.pdf..."
    }
  ]
}
```

### 3. 獲取已索引的文件

```bash
curl -X GET http://localhost:3000/api/rag/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 前端整合

待實作：
- 文件上傳 UI 組件
- RAG 查詢介面
- 文件管理列表
- 整合到 ChatBot

## 資料庫 Schema

### `rag_documents`
- `id`: 文件 ID
- `user_id`: 用戶 ID
- `file_name`: 文件名稱
- `file_type`: 文件類型
- `file_size`: 文件大小
- `content`: 文件內容
- `metadata`: JSON 元數據

### `rag_embeddings`
- `id`: 嵌入 ID
- `document_id`: 文件 ID (外鍵)
- `content`: 文本塊內容
- `embedding`: 向量 (1536 dimensions)
- `metadata`: JSON 元數據

## 疑難排解

### PostgreSQL 連接失敗

```bash
# 確認 PostgreSQL 正在運行
psql -U postgres -c "SELECT version();"

# 檢查連接
psql postgresql://postgres:postgres@localhost:5432/supermd_rag
```

### pgvector 擴展未安裝

```sql
-- 檢查可用擴展
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- 手動安裝
CREATE EXTENSION IF NOT EXISTS vector;
```

### 權限問題

```sql
-- 賦予權限
GRANT ALL PRIVILEGES ON DATABASE supermd_rag TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

## 性能優化

1. **索引優化**: 使用 IVFFlat 索引（已配置，lists=100）
2. **批次處理**: 大文件自動分塊處理
3. **快取**: 考慮添加 Redis 快取搜尋結果

## 下一步

- [ ] 創建前端文件上傳組件
- [ ] 整合到 ChatBot 介面
- [ ] 添加文件預覽功能
- [ ] 實作文件版本控制
- [ ] 添加多模態支援（圖片、表格）

## 參考資源

- [LangChain ReAct Agent](https://js.langchain.com/docs/modules/agents/agent_types/react)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
