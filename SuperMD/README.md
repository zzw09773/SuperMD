# SuperMD

A modern, collaborative Markdown editor with dual-mode AI assistance (GPT-5 Chat + Deep Research) and real-time collaboration features.

## ✨ Features

### 🎯 Core Features
- 📝 **Rich Markdown Editor** - Powered by CodeMirror 6 with syntax highlighting
- ✨ **Markdown Autocomplete** - Smart suggestions with floating popup menu
- 🎨 **Live Preview** - See your formatted markdown in real-time (CodiMD-style split view)
- 📊 **Hierarchical Headings** - Clear visual distinction between H1-H6
- 🤝 **Real-time Collaboration** - Multiple users can edit documents simultaneously with Socket.io
- 💾 **Auto-save** - Never lose your work with automatic saving
- 📤 **Multi-format Export** - Export to MD, HTML, PDF, DOCX, and TXT formats
- 🖼️ **Image Upload** - Paste images directly into editor

### 🤖 Dual-Mode AI Assistant
- 💬 **Chat Mode** - Fast conversations with GPT-5
- 🔍 **Research Mode** - Deep research with Google Custom Search + LangGraph
  - Real-time reasoning process display (animated marquee)
  - Tool call tracking (Google Search, Calculator, Document Search)
  - Automatic source citation and references

### 📁 Project Management
- 🗂️ **ChatGPT-style Organization** - Organize documents into projects
- 🖱️ **Drag & Drop** - Move documents between projects and ungrouped section
- 📋 **Visual Feedback** - Expandable folders with icons and hover effects

### 🛠️ Editor Toolbar
- **7 Formatting Buttons**: Bold, Italic, Code, Link, Image, Bullet List, Numbered List
- **Preview Toggle**: Show/hide preview pane
- **Export Dropdown**: Quick access to all export formats

### 📊 Status Indicators
- 💚 **Connection Status** - Real-time connection state
- 👥 **Active Users** - See how many users are collaborating
- ⏰ **Save Status** - Last saved timestamp

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API Key (for GPT-5)
- Google Custom Search API credentials (optional, for Research mode)

### Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/SuperMD.git
cd SuperMD

# Install dependencies
cd client && npm install
cd ../server && npm install

# Configure environment
cd server
cp .env.example .env
# Edit .env with your API keys

# Start backend (Terminal 1)
cd server && npm run dev

# Start frontend (Terminal 2)
cd client && npm run dev
```

**Access the app**: http://localhost:5174

## 📋 Next Steps

查看 [PROGRESS.md](./PROGRESS.md) 獲取：
- ✅ 完整功能清單與進度
- 🐛 已修復的問題記錄
- 🚀 Phase 4-7 Roadmap

### Phase 4: 資料持久化 (下一步)
- [ ] Prisma + SQLite 資料庫整合
- [ ] 用戶認證系統
- [ ] 文件權限管理

### Phase 5: 進階功能
- [ ] 版本歷史 (Git-like)
- [ ] PWA 離線支援
- [ ] 多語言介面 (i18n)

### Phase 6: 效能優化
- [ ] React 虛擬化
- [ ] 圖片 CDN
- [ ] 程式碼分割

## 🤝 Contributing

歡迎貢獻！請隨時提交 Pull Request。

## 📄 License

MIT License

## 🙏 Acknowledgments

- OpenAI GPT-5
- Google Custom Search API
- LangChain/LangGraph
- React + Vite
- Claude Code 🤖

---

**Status**: ✅ Phase 1-3 完成 | **Version**: 0.2.0 | **Updated**: 2025-10-06
