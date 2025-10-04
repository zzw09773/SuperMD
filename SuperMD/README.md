# SuperMD

A modern, collaborative Markdown editor with AI assistance and real-time collaboration features.

## Features

- 📝 **Rich Markdown Editor** - Powered by CodeMirror with syntax highlighting
- 🤝 **Real-time Collaboration** - Multiple users can edit documents simultaneously
- 🤖 **AI Assistant** - Integrated GPT-powered chatbot for writing assistance
- 📊 **Mermaid Diagrams** - Create flowcharts, diagrams, and visualizations
- 💾 **Auto-save** - Never lose your work with automatic saving
- 📁 **Folder Organization** - Organize documents in a hierarchical structure
- 🎨 **Live Preview** - See your formatted markdown in real-time
- 📤 **Export** - Export to MD, HTML, PDF, DOCX, and TXT formats
- 🔍 **Search** - Full-text search across all documents
- 📜 **Version History** - Track and restore previous versions

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- CodeMirror 6
- TailwindCSS
- Socket.IO Client
- Y.js (CRDT for collaboration)

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- SQLite
- Socket.IO
- OpenAI API

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/SuperMD.git
cd SuperMD
```

2. Install dependencies:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

3. Set up environment variables:
```bash
cd server
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

4. Initialize the database:
```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

5. Start the development servers:
```bash
# From root directory
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Project Structure

```
SuperMD/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── lib/           # Utilities
│   ├── prisma/            # Database schema
│   └── package.json
├── shared/                # Shared types and utilities
└── docs/                  # Documentation

```

## API Endpoints

- `GET /api/documents` - Get all documents
- `POST /api/documents` - Create a new document
- `PUT /api/documents/:id` - Update a document
- `DELETE /api/documents/:id` - Delete a document
- `GET /api/folders` - Get all folders
- `POST /api/chat` - Chat with AI assistant

## WebSocket Events

- `join-document` - Join a document room
- `leave-document` - Leave a document room
- `sync-update` - Sync document changes
- `awareness-update` - Sync cursor positions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Inspired by HackMD and CodiMD
- Built with modern web technologies
- Powered by OpenAI GPT models
