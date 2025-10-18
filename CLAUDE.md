# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

**SuperMD** is a modern, collaborative Markdown editor with dual-mode AI assistance and real-time collaboration. It combines rich editing with intelligent research/knowledge base retrieval powered by LLMs.

## Architecture at a Glance

- **Monorepo**: client/ (React), server/ (Express), prisma/ (DB schema)
- **Frontend**: Vite + React 18 + TypeScript + CodeMirror 6
- **Backend**: Express + TypeScript + Socket.IO + Prisma
- **Database**: PostgreSQL 15+ with pgvector extension
- **AI**: OpenAI API + LangChain/LangGraph agents
- **Real-time**: Socket.IO + Y.js CRDT for collaborative editing

## Frontend Architecture

### Tech Stack
- Vite (fast bundler), React 18.2, TypeScript
- CodeMirror 6 + Y.js (collaborative editing)
- Socket.IO client + Yjs CRDT sync
- Axios (HTTP) with JWT interceptors
- Tailwind CSS + @tailwindcss/typography
- react-markdown with plugins (math, GFM, footnotes)
- react-resizable-panels (split-pane editor)

### State Management
Pure React hooks (no Redux/Zustand):
- useChat(): Message state + API integration
- useCollaboration(): Socket.IO connection + active users
- useAutoSave(): Debounced document saving (3s)
- Local component state for UI

### Component Structure
```
App.tsx (auth check + routing)
  └─ MainLayout (main container)
      ├─ ProjectSidebar (document tree + projects)
      ├─ MarkdownEditor (CodeMirror + live preview)
      ├─ ChatBotPanel (AI: Chat/Research/RAG modes)
      └─ RAGDocumentPanel (vector DB file manager)
```

### Key Data Flows
1. **Auth**: Login → JWT → localStorage + axios interceptor
2. **Editing**: Editor change → debounce 3s → PATCH /api/document/:id
3. **Collaboration**: Join document → Y.js sync via Socket.IO
4. **Chat**: User input → API stream (SSE/fetch) → DB save
5. **RAG**: File upload → parse → chunk → embed → pgvector index

## Backend Architecture

### Tech Stack
- Express.js + Socket.IO (WebSocket server)
- Prisma ORM + PostgreSQL
- LangChain + LangGraph (AI agents)
- OpenAI API + pgvector (embeddings/search)
- Redis (optional caching)
- Multer (file uploads)
- Export: jsPDF, @turbodocx/html-to-docx, marked

### Route Structure
```
/api/auth          - JWT login/register
/api/document      - CRUD operations (Prisma)
/api/documents     - List with pagination
/api/projects      - Project management
/api/folders       - Folder hierarchy
/api/chat          - Chat completion (OpenAI)
/api/research      - Research agent (SSE streaming)
/api/rag           - Upload/search/delete RAG docs
/api/chat-history  - Load/save/clear messages
/api/export        - Multi-format export
```

### Service Layer
- documentService: DB queries via Prisma
- authService: JWT gen/verification + bcrypt
- openaiService: GPT wrapper
- exportService: Markdown→HTML→PDF/DOCX
- ragService: Vector search + embeddings
- fileParser: PDF/DOCX/TXT/CSV parsing

### Socket.IO Events
- join-document: Enter editing room
- sync-update: Y.js CRDT broadcast
- awareness-update: Cursor position sync
- user-joined/left: Presence notifications
- room-info: User count update

## Database Schema (PostgreSQL)

Key models:
- User: email, hashed password, avatar
- Document: title, content, userId, projectId, folderId
- Project: name, color, documents[]
- ChatMessage: documentId, role, content, mode (chat/research/rag)
- DocumentPermission: sharing/access control
- Version: document version history
- rag_documents: indexed files (user_id, file_name, content)
- rag_embeddings: vector embeddings (document_id, embedding: vector(1536))

## AI Features Implementation

### 1. Chat Mode
- Endpoint: POST /api/chat
- Calls OpenAI API directly
- Response saved to ChatMessage DB

### 2. Research Mode
- Endpoint: GET /api/research/query (SSE streaming)
- LangGraph ReAct agent with tools:
  - Google Custom Search API (JWT auth)
  - Calculator (math expressions)
  - Document Search (search current doc)
  - Wikipedia, arXiv, StackOverflow, GitHub tools
- Streams reasoning + tool calls + sources to client
- Animated marquee shows thinking process

### 3. RAG (Retrieval-Augmented Generation)
- Endpoints: POST /upload, POST /query, DELETE /:id
- Workflow:
  1. File upload → parse (pdf-parse, mammoth, Tesseract)
  2. Split into chunks (RecursiveCharacterTextSplitter: 1000 chars)
  3. Generate embeddings (text-embedding-3-small)
  4. Store in pgvector with cosine index
  5. On query: embed question → similarity search → LLM generation
  6. Redis caches results

## Export System

Supports 5 formats:
1. Markdown (.md) - direct text
2. HTML (.html) - marked parser
3. PDF (.pdf) - jsPDF with embedded images
4. DOCX (.docx) - @turbodocx/html-to-docx
5. Text (.txt) - plain text

Image embedding: Detects ![alt](/uploads/xxx.png) → base64 → embeds in all formats

## Authentication & Authorization

- JWT-based: email + password → bcrypt verify → token generation
- Token stored in localStorage
- All API calls include Authorization: Bearer <token>
- authMiddleware verifies + attaches user to request
- Document permissions model: owner + read/write sharing

## Collaboration & Real-time

- Y.js CRDT: Conflict-free collaborative editing
- Socket.IO: WebSocket transport with polling fallback
- Rooms: one per documentId
- Status display: connection indicator + active user count + save timestamp

## Performance Optimizations

Frontend:
- Vite code splitting
- 3s debounce before auto-save
- Resizable panels prevent re-renders
- Lazy component loading

Backend:
- SSE streaming for research (don't wait for full response)
- Batch processing for RAG (respect API rate limits)
- PostgreSQL indexes on userId, projectId, lastEditedAt
- IVFFlat vector index for fast similarity search
- Redis caching of search results
- Connection pooling (pg library)

## Common Development Commands

### Initial Setup
```bash
# Install all dependencies (from repo root)
cd SuperMD
npm install                    # Installs root workspace dependencies
cd client && npm install       # Install frontend deps
cd ../server && npm install    # Install backend deps

# Database setup (PostgreSQL required with pgvector extension)
cd server
cp .env.example .env          # Configure environment variables
npx prisma migrate deploy     # Run migrations (first time)
npx prisma generate          # Generate Prisma client
```

### Development
```bash
# From repo root (SuperMD/) - runs both services concurrently
npm run dev                   # Starts both client + server

# Or run separately:
npm run dev:server           # Backend only (port 3000)
npm run dev:client           # Frontend only (port 5173)

# Individual services:
cd server && npm run dev     # Backend with tsx watch
cd client && npm run dev     # Frontend with Vite HMR
```

### Building
```bash
# From repo root
npm run build                # Builds both server + client
npm run build:server         # Backend only (TypeScript → dist/)
npm run build:client         # Frontend only (Vite → dist/)

# Production start (after build)
npm start                    # Runs server/dist/index.js
```

### Testing
```bash
cd server
npm test                     # Run Vitest tests
npm run test:run             # Single test run (CI mode)
```

### Linting
```bash
cd client && npm run lint    # ESLint for React/TypeScript
cd server && npm run lint    # ESLint for backend
```

### Database Operations
```bash
cd server
npx prisma migrate dev       # Create + apply new migration
npx prisma migrate reset     # Reset DB and reapply migrations
npx prisma studio            # Open Prisma Studio (DB GUI)
npx prisma generate          # Regenerate Prisma client after schema changes

# SQLite to PostgreSQL migration
npm run migrate:sqlite-to-postgres
```

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ with pgvector extension enabled
- Redis (optional, for RAG caching)
- OpenAI API key (required)
- Google Custom Search credentials (optional, for Research mode)

### Environment Variables (server/.env)
```bash
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/supermd
POSTGRES_URL=postgresql://...    # For RAG/pgvector
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=your-secret-key
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
GOOGLE_SEARCH_ENGINE_ID=...
```

### Access Points
- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:3000
- Prisma Studio: http://localhost:5555 (when running)

## Project Status

**Phase**: 3 (Enhanced) - 100% complete
- Core editing + collaboration working
- RAG fully implemented
- 5-format export working
- Auto-save + chat history functioning

## Key Files Reference

Frontend:
- Entry: client/src/main.tsx → App.tsx
- API: client/src/services/api.ts
- Hooks: client/src/hooks/use*.ts
- UI: client/src/components/layout/MainLayout.tsx
- Editor: client/src/components/editor/MarkdownEditor.tsx
- Chat: client/src/components/chat/ChatBotPanel.tsx
- RAG: client/src/components/rag/RAGDocumentPanel.tsx

Backend:
- Entry: server/src/index.ts (Express + Socket.IO setup)
- Routes: server/src/routes/*.ts
- Services: server/src/services/*.ts
- Agents: server/src/agents/researchAgent.ts
- DB: server/prisma/schema.prisma
- Auth: server/src/middleware/auth.ts
- Libs: server/src/lib/pgvector.ts, redis.ts, permissions.ts

## External Dependencies

1. OpenAI: gpt-4o-mini (chat), text-embedding-3-small (embeddings)
2. Google Custom Search: Research tool, JWT auth, 100 free queries/day
3. PostgreSQL pgvector: Vector similarity search (must enable pgvector extension)
4. Redis: Optional caching layer

## Important Architectural Conventions

### Frontend Patterns
- **Layout Composition**: `MainLayout.tsx` uses `react-resizable-panels` to compose editor, AI chat, and RAG panels
- **Auto-save Flow**: `MarkdownEditor.tsx` → `useAutoSave.ts` (2s debounce) → `documentAPI.update` → `/api/document/:id`
- **Sidebar State**: `ProjectSidebar.tsx` maintains optimistic state, mirrors backend sorting (`updatedAt desc`)
- **API Payloads**: Keep payload shapes `{ document }`, `{ projects }` intact when extending services
- **TypeScript Types**: Shared types live in `client/src/types/index.ts`; Prisma enforces canonical field names

### Socket.IO Events (DO NOT CHANGE)
Preserve these event names for collaboration compatibility:
- `join-document` - Enter editing room
- `room-info` - User count update
- `user-joined` / `user-left` - Presence notifications
- `sync-update` - Y.js CRDT sync
- `awareness-update` - Cursor position sync

Hook: `useCollaboration.ts` expects these exact event names.

### Backend Patterns
- **Route Registration**: `server/src/index.ts` mounts all route modules; register new APIs there
- **Auth Flow**: `authMiddleware` injects `req.user`; all protected routes require valid JWT from `authService.ts`
- **Token Handling**: Frontend axios interceptor in `client/src/services/api.ts` auto-attaches JWT
- **Document Updates**: Guard against empty content; preserve `lastEditedAt` semantics
- **Auto-save Titles**: Uses document headings for titles automatically

### AI Streaming Formats (Wire Protocol)
Chat modes share `useChat.ts` hook. Maintain these exact response formats:

**REST Chat** (`/api/chat`):
```json
{ "message": "...", "sources": [...] }
```

**RAG Query** (`/api/rag/query`):
```json
{ "answer": "...", "sources": [...] }
```

**Research SSE** (`/api/research/query`):
- Streams `{ type, content }` chunks
- Event types: `reasoning` (marquee), `tool_call`, `tool_result`, `chunk`
- Final payload: `{ done: true, fullResponse, toolCalls, sources }`
- End signal: `[DONE]` string

**Chat Streaming** (`stream=true`):
- Outputs `{ chunk }` events
- Frontend must parse `[DONE]` signal
- Errors after headers: `data: { error }`

### RAG Architecture Details
- **Storage**: PostgreSQL `rag_documents` (metadata) + `rag_embeddings` (1536-dim vectors)
- **Index**: IVFFlat for fast cosine similarity (`embedding <=> $1::vector`)
- **Cache**: Redis with key pattern `rag:search:<md5>`
- **Workflow**: Cache miss → embed query → similarity search → LLM generation
- **Initialization**: `initializePgVector()` + `initializeRedis()` run on server start
- **Graceful Degradation**: If Redis/pgvector fail, must fallback gracefully

### Export System
- **Service**: `server/src/services/exportService.ts`
- **Image Handling**: Keep URLs relative (`/uploads/images/...`) so exports can inline them
- **Formats**: Embeds `/uploads` assets before converting to PDF/DOCX

### Testing Strategy (Phase 4 Future)
- Backend: Vitest/Jest + Supertest
- Frontend: Vitest + React Testing Library for SSE simulation
- E2E: Playwright (login → edit → stream → export flow)
- CI: GitHub Actions with PostgreSQL service

### Legacy Code
- `routes/documents.ts` (in-memory) exists for reference only
- New work should use Prisma-backed `routes/document.ts` + `project.ts`

### Critical Constraints
- **Do NOT shutdown non-project npm processes** - only server and client npm can be terminated
- **Never use git commands with -i flag** - interactive commands not supported
- **Preserve TypeScript strictness** - strict mode is enforced
- **Image uploads**: `/api/upload-image` requires auth token, must return `{ url }`

### Documentation Resources
- Feature context: `PROGRESS.md`, `ADVANCED_RAG_FEATURES.md`, `RAG_SETUP.md`
- Phase 4 planning: `docs/phase-4-spike.md`
- Credentials setup: `CREDENTIALS_SETUP.md`
- Skim these before large refactors
