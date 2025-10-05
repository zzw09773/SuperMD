# 🧠 SuperMD Agentic RAG 功能完整指南

## 🎉 功能概覽

SuperMD 現在配備了完整的 **Agentic RAG (Retrieval-Augmented Generation)** 系統，讓您可以：

1. 📤 **上傳文件** - 支援 PDF, DOCX, TXT, Markdown
2. 🔍 **智能索引** - 自動向量化並建立語義搜尋索引
3. 💬 **知識問答** - 從上傳的文件中智能提取答案
4. 🤖 **多模式 AI** - Chat、Research、RAG 三種模式任選

---

## 🚀 快速開始

### 1. 啟動系統

```bash
# 後端服務器（已運行）
cd SuperMD/server
npm run dev
# ✅ 運行在 http://localhost:3000

# 前端應用（已運行）
cd SuperMD/client
npm run dev
# ✅ 運行在 http://localhost:5173

# PostgreSQL + pgvector (Docker)
docker ps | grep supermd-postgres
# ✅ 容器正在運行
```

### 2. 登入系統

訪問 http://localhost:5173

- Email: `test@supermd.com`
- Password: `password123`

### 3. 上傳文件到知識庫

1. 點擊右上角紫色 **"Show RAG"** 按鈕
2. RAG 面板打開後，點擊 **"上傳文件"**
3. 拖放文件或點擊選擇（支援 PDF, DOCX, TXT, MD）
4. 等待向量化完成（幾秒鐘）
5. 文件出現在列表中 ✅

### 4. 使用 RAG 查詢

1. 點擊右上角綠色 **"Show AI Assistant"** 按鈕
2. 在 AI 助手面板中，選擇 **"RAG"** 模式（綠色）
3. 輸入問題，例如："這個文件的主要內容是什麼？"
4. AI 會從您上傳的文件中找到答案並引用來源！

---

## 📊 功能詳解

### 前端組件

#### 1. **FileUploadModal** (文件上傳彈窗)
- **位置**: `client/src/components/rag/FileUploadModal.tsx`
- **功能**:
  - 拖放上傳
  - 文件類型驗證（PDF, DOCX, TXT, MD）
  - 文件大小限制（10MB）
  - 上傳進度顯示
  - 成功/錯誤提示

#### 2. **RAGDocumentPanel** (文件管理面板)
- **位置**: `client/src/components/rag/RAGDocumentPanel.tsx`
- **功能**:
  - 顯示所有已索引文件
  - 文件詳情（大小、向量區塊數、上傳時間）
  - 刪除文件（同時刪除向量索引）
  - 重新載入列表

#### 3. **ChatBotPanel** (AI 助手，已整合 RAG)
- **位置**: `client/src/components/chat/ChatBotPanel.tsx`
- **功能**:
  - 三種模式切換：
    - 💬 **Chat** - GPT-5 快速對話
    - 🔍 **Research** - Google + LangGraph 深度研究
    - 🧠 **RAG** - 知識庫查詢（新增！）
  - 顯示 RAG 來源文件
  - 顯示網頁搜尋來源
  - 對話歷史記錄

#### 4. **MainLayout** (主界面佈局)
- **位置**: `client/src/components/layout/MainLayout.tsx`
- **新增按鈕**:
  - 🟣 **Show/Hide RAG** - 切換 RAG 文件管理面板
  - 🟢 **Show/Hide AI Assistant** - 切換 AI 助手
  - 🔴 **Logout** - 登出

### 後端 API

#### RAG 端點

| 端點 | 方法 | 說明 | 需要認證 |
|------|------|------|----------|
| `/api/rag/upload` | POST | 上傳文件並建立向量索引 | ✅ |
| `/api/rag/documents` | GET | 獲取所有已索引文件 | ✅ |
| `/api/rag/documents/:id` | DELETE | 刪除文件和向量索引 | ✅ |
| `/api/rag/search` | POST | 向量搜尋（僅檢索） | ✅ |
| `/api/rag/query` | POST | **Agentic RAG 查詢** | ✅ |

#### 關鍵服務

1. **fileParser.ts** - 文件解析器
   - PDF → `pdf-parse`
   - DOCX → `mammoth`
   - TXT/MD → 直接讀取

2. **ragService.ts** - RAG 核心服務
   - 文本分塊（chunk size: 1000, overlap: 200）
   - 向量嵌入（OpenAI text-embedding-3-small）
   - pgvector 儲存和檢索

3. **agenticRAG.ts** - 智能 RAG 查詢
   - 使用 GPT-5（temperature=1）
   - 知識庫檢索工具
   - 自動引用來源

---

## 🎯 使用場景

### 場景 1: 研究論文總結
```
1. 上傳研究論文 PDF
2. 切換到 RAG 模式
3. 問："這篇論文的主要貢獻是什麼？"
4. AI 從論文中提取關鍵信息並回答
```

### 場景 2: 技術文檔查詢
```
1. 上傳 API 文檔、用戶手冊
2. 使用 RAG 模式
3. 問："如何設置認證？"
4. AI 從文檔中找到相關步驟
```

### 場景 3: 多文件比較
```
1. 上傳多個相關文檔
2. 問："這幾個文檔的共同主題是什麼？"
3. AI 從所有文檔中綜合答案
```

---

## 🔧 技術架構

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│  ┌────────────┐  ┌───────────────┐ │
│  │  RAG Panel │  │   ChatBot     │ │
│  │  - Upload  │  │   - Chat      │ │
│  │  - Manage  │  │   - Research  │ │
│  └────────────┘  │   - RAG ✨    │ │
│                  └───────────────┘  │
└────────────┬────────────────────────┘
             │ HTTP/REST API
┌────────────▼────────────────────────┐
│      Backend (Express/TS)           │
│  ┌──────────────────────────────┐  │
│  │      RAG Services             │  │
│  │  - File Parser (PDF/DOCX)    │  │
│  │  - Vector Embedding (OpenAI) │  │
│  │  - Agentic Query (GPT-5)     │  │
│  └──────────────────────────────┘  │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   PostgreSQL + pgvector (Docker)    │
│  ┌──────────────────────────────┐  │
│  │  Tables:                      │  │
│  │  - rag_documents              │  │
│  │  - rag_embeddings (vector)    │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 📈 數據流程

### 上傳流程
```
1. 用戶選擇文件 → FileUploadModal
2. 前端發送 FormData → /api/rag/upload
3. 後端解析文件 → fileParser
4. 文本分塊 → ragService.chunkText()
5. 向量嵌入 → OpenAI API
6. 儲存到 pgvector → rag_documents + rag_embeddings
7. 返回成功 → 前端更新列表
```

### 查詢流程
```
1. 用戶輸入問題 → ChatBot (RAG mode)
2. 前端發送查詢 → /api/rag/query
3. 後端向量搜尋 → searchSimilarDocuments()
4. 找到相關文本塊 → 前 5 個結果
5. 組合提示詞 → GPT-5
6. 生成答案 → 包含來源引用
7. 返回結果 → 前端顯示（帶來源文件名）
```

---

## 🎨 UI 特色

### RAG 文件管理面板
- 🟣 **紫色主題** - 與 RAG 模式一致
- 📊 **文件詳情卡片** - 顯示大小、向量區塊數、時間
- 🗑️ **Hover 刪除按鈕** - 滑鼠懸停顯示
- 🔄 **重新載入** - 一鍵刷新列表
- 📤 **拖放上傳** - 支援拖放和點擊上傳

### AI 助手 RAG 模式
- 🟢 **綠色 RAG 按鈕** - 清楚標識知識庫模式
- 📄 **來源引用** - 顯示每個答案的文件來源
- 🔍 **區分來源類型**:
  - 🟢 綠色點 - RAG 知識庫來源
  - 🔵 藍色鏈接 - 網頁搜尋來源

---

## 🐛 疑難排解

### 前端問題

**問題**: 上傳按鈕無反應
```bash
# 檢查瀏覽器 Console
# 確認後端運行：http://localhost:3000/health
# 確認登入 token 有效
```

**問題**: RAG 查詢失敗
```bash
# 檢查是否有上傳文件
# 確認 PostgreSQL 運行：docker ps | grep supermd
# 查看後端日誌
```

### 後端問題

**問題**: 文件上傳失敗
```bash
# 確認 uploads/ 目錄存在
mkdir -p SuperMD/server/uploads

# 檢查文件大小 < 10MB
# 檢查文件格式是否支援
```

**問題**: pgvector 連接失敗
```bash
# 重啟 PostgreSQL 容器
docker restart supermd-postgres

# 檢查連接字串
echo $POSTGRES_URL

# 測試連接
docker exec supermd-postgres psql -U postgres -d supermd_rag -c "SELECT 1"
```

---

## 📝 API 使用範例

### 上傳文件
```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:3000/api/rag/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"
```

### 獲取文件列表
```bash
curl http://localhost:3000/api/rag/documents \
  -H "Authorization: Bearer $TOKEN"
```

### RAG 查詢
```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"文件的主要內容是什麼？"}'
```

### 刪除文件
```bash
curl -X DELETE http://localhost:3000/api/rag/documents/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 下一步擴展

### 計劃中的功能

1. **更多文件格式**
   - ✅ PDF, DOCX, TXT, MD（已支援）
   - 🔜 圖片（OCR）
   - 🔜 程式碼文件（語法高亮）
   - 🔜 表格（結構化提取）

2. **性能優化**
   - 🔜 Redis 快取搜尋結果
   - 🔜 批次處理大文件
   - 🔜 增量索引更新

3. **進階功能**
   - 🔜 文件版本控制
   - 🔜 多模態支援（圖文混合）
   - 🔜 自定義 embedding 模型
   - 🔜 知識圖譜視覺化

---

## ✅ 已完成的里程碑

- [x] Docker PostgreSQL + pgvector 設置
- [x] 文件上傳 API (PDF, DOCX, TXT, MD)
- [x] 向量嵌入服務 (OpenAI)
- [x] Agentic RAG 查詢 (GPT-5)
- [x] 文件上傳 UI（拖放）
- [x] RAG 文件管理面板
- [x] ChatBot RAG 模式整合
- [x] 來源引用顯示
- [x] 完整的前後端整合

---

## 🎉 總結

**SuperMD 現在擁有完整的 Agentic RAG 功能！**

您可以：
✅ 上傳任意文檔（PDF, DOCX, TXT, MD）
✅ 自動建立向量索引
✅ 使用自然語言查詢文檔內容
✅ 獲得帶來源引用的準確答案
✅ 管理您的知識庫

**開始使用**: http://localhost:5173

**Docker 容器**: `supermd-postgres` 運行中
**後端 API**: http://localhost:3000
**前端應用**: http://localhost:5173

---

## 📚 相關文檔

- [Docker 設置指南](./SuperMD/server/DOCKER_SETUP.md)
- [RAG 系統說明](./SuperMD/server/RAG_SETUP.md)
- [API 文檔](./SuperMD/server/API_DOCS.md)

**享受您的智能知識庫！** 🚀
