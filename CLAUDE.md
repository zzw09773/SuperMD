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

**Current Version**: v0.3.1
**Phase**: 3.5 (Code Quality Enhancement) - **COMPLETED** ✅

### Recent Improvements (Latest - 2025-10-18)
- ✅ **Research Agent Graceful Degradation**
  - Fixed "database does not exist" crash in Research mode
  - Implemented try-catch wrappers in [agentMemory.ts](server/src/lib/agentMemory.ts)
  - Research now works without PostgreSQL (degraded mode: no memory)
  - Research works with PostgreSQL (full mode: memory management enabled)

- ✅ **UI Stability Improvements**
  - Fixed marquee animation causing layout destruction
  - Simplified from infinite scroll to static display in [ChatBotPanel.tsx](client/src/components/chat/ChatBotPanel.tsx:109-131)
  - Changed reasoning messages to replace instead of accumulate

- ✅ **Enhanced Error Reporting**
  - SSE error handling improved in [research.ts](server/src/routes/research.ts:68-85)
  - Added specific error messages instead of generic "Research failed"
  - Fixed EventSource error detection in [useChat.ts](client/src/hooks/useChat.ts:123-207)
  - Added `hasReceivedData` flag to distinguish connection errors from normal stream end

- ✅ **TypeScript Type Safety - 100% Fixed**
  - All 44 compilation errors resolved (44 → 0)
  - Type guards implemented across all routes (18 endpoints)
  - `req.user` safety checks in chatHistory, document, project, rag routes

- ✅ **ESLint Configuration Established**
  - Backend .eslintrc.json created
  - Strict TypeScript checking enabled
  - 24 non-blocking linting warnings (code style suggestions)

- ✅ **Code Quality Improvements**
  - Error handling standardized (401/404/500 responses)
  - 15+ files cleaned and refactored
  - Zero TypeScript compilation errors on both frontend & backend

### Phase Completion Status
- **Phase 1-3**: Core editing, AI assistant, collaboration - 100% ✅
- **Phase 3.5**: Type safety & code quality - 100% ✅
- **Phase 4**: Data persistence & testing - 0% (Next)
- **Phase 5+**: Advanced features - Planned

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

### Graceful Degradation Pattern (CRITICAL)
**Always wrap optional service calls in try-catch blocks** to prevent complete system failure:

```typescript
// GOOD: System continues without optional feature
export const loadAgentMemory = async (userId: string, mode: string) => {
  try {
    const client = await pool.connect();
    try {
      // ... database operations
      return { summary, entries };
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn('[Service] Database unavailable, using fallback:', error);
    return { entries: [] };  // Return safe default
  }
};

// BAD: Uncaught error crashes entire request
export const loadAgentMemory = async (userId: string, mode: string) => {
  const client = await pool.connect();  // ❌ Will crash if DB unavailable
  // ...
};
```

**Apply to**:
- PostgreSQL queries (RAG, agent memory)
- Redis operations (caching)
- External API calls (OpenAI, Google Search)
- File system operations

**Key principle**: Optional features should never break core functionality

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

## Troubleshooting Guide

### Research Mode Issues

#### Problem: "Research failed: database 'supermd_rag' does not exist"
**Root Cause**: Agent memory management in [agentMemory.ts](server/src/lib/agentMemory.ts) tried to connect to PostgreSQL, but the database wasn't initialized.

**Solution**: Implemented graceful degradation pattern:
```typescript
export const loadAgentMemory = async (
  userId: string,
  mode: AgentMemoryMode
): Promise<LoadedAgentMemory> => {
  try {
    const client = await pool.connect();
    try {
      // ... normal database operations
      return { summary, entries };
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn('[AgentMemory] Database unavailable, using empty memory:', error);
    return { entries: [] };  // Continue without memory
  }
};
```

**Result**: Research mode now works in two modes:
- **Without PostgreSQL**: Degraded mode (no conversation memory)
- **With PostgreSQL**: Full mode (memory management enabled)

#### Problem: Marquee Animation Destroys UI Layout
**Symptoms**: When Research mode shows thinking indicator, the entire screen layout collapses and requires page refresh.

**Root Causes**:
1. Complex infinite scroll animation (`animate-marquee`) causing layout reflows
2. Reasoning messages accumulating instead of replacing each other

**Solutions**:
1. **Simplified marquee in [ChatBotPanel.tsx](client/src/components/chat/ChatBotPanel.tsx:109-131)**:
   - Removed infinite scroll animation
   - Changed to static display with simple spin/bounce animations
   - Maintained visual feedback without complex CSS animations

2. **Fixed message accumulation in [useChat.ts](client/src/hooks/useChat.ts:157-168)**:
   ```typescript
   // Replace reasoning messages instead of accumulating
   if (data.type === 'reasoning') {
     setMessages((prev) => {
       const filtered = prev.filter(m => m.metadata?.type !== 'reasoning');
       const reasoningMsg: ChatMessage = {
         id: 'reasoning-current',
         role: 'system',
         content: data.content,
         timestamp: new Date(),
         metadata: { type: 'reasoning' },
       };
       return [...filtered, reasoningMsg];
     });
   }
   ```

**Result**: Stable UI with clear visual feedback during Research operations.

#### Problem: Generic "Research failed" Error Messages
**Issue**: Original error handling showed generic "Research failed" for all errors, making debugging impossible.

**Solution in [research.ts](server/src/routes/research.ts:68-85)**:
```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : '';

  console.error('[Research API] Error:', errorMessage);
  console.error('[Research API] Stack:', errorStack);

  if (!res.headersSent) {
    res.status(500).json({ error: errorMessage });
  } else {
    res.write(`data: ${JSON.stringify({
      error: `Research failed: ${errorMessage}`  // Show specific error
    })}\n\n`);
    res.end();
  }
}
```

**Result**: Specific error messages help identify root causes (e.g., "database does not exist" instead of generic failure).

#### Problem: SSE Connection Errors Confused with Normal Stream End
**Issue**: EventSource `onerror` triggered both for connection failures AND normal stream completion, showing false error messages.

**Solution in [useChat.ts](client/src/hooks/useChat.ts:189-207)**:
```typescript
let hasReceivedData = false;

eventSource.onmessage = (event) => {
  hasReceivedData = true;  // Mark that we got at least one message
  // ... handle messages
};

eventSource.onerror = (error) => {
  console.error('[Research SSE] Connection error:', error);
  eventSource.close();

  // Only show error if no data was received (actual connection failure)
  if (!hasReceivedData) {
    setMessages(prev => [...prev, {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: 'Failed to connect to Research service...',
      timestamp: new Date(),
    }]);
  }
  setIsLoading(false);
};
```

**Result**: Clean stream completion without false error messages, while still catching real connection failures.

### General Database Issues

#### Problem: PostgreSQL Connection Failures
**Check**:
1. Is PostgreSQL running? `pg_isready -h localhost -p 5432`
2. Does database exist? `psql -l | grep supermd`
3. Is pgvector extension enabled? `psql supermd -c "SELECT * FROM pg_extension WHERE extname = 'vector';"`

**Fix**:
```bash
# Create database if missing
createdb supermd

# Enable pgvector extension
psql supermd -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
cd server && npx prisma migrate deploy
```

#### Problem: Redis Connection Failures
**Impact**: RAG caching disabled, but system continues to work.

**Check**: `redis-cli ping` should return `PONG`

**Fix**: Start Redis server or install if missing:
```bash
# macOS
brew install redis && brew services start redis

# Linux
sudo apt install redis-server && sudo systemctl start redis
```

### Frontend Issues

#### Problem: "Failed to fetch" in Chat/Research Mode
**Common Causes**:
1. Backend server not running (check `http://localhost:3000`)
2. CORS configuration issue
3. JWT token expired or invalid

**Debug Steps**:
```bash
# Test backend health
curl http://localhost:3000/api/health

# Test with valid token
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/documents
```

#### Problem: Auto-save Not Working
**Check**: Console for debounce messages (3-second delay is intentional)

**Verify**: `useAutoSave.ts` debounce timer is 3000ms

### Documentation Resources
- Feature context: `PROGRESS.md`, `ADVANCED_RAG_FEATURES.md`, `RAG_SETUP.md`
- Phase 4 planning: `docs/phase-4-spike.md`
- Credentials setup: `CREDENTIALS_SETUP.md`
- Skim these before large refactors

---

## Next Development Roadmap

### 🔥 Phase 4A: Testing Infrastructure (High Priority)

**Goal**: Establish comprehensive testing framework for stability

#### Backend Testing
- [ ] **Unit Tests** (Vitest + Supertest)
  - Auth routes (`/api/auth` - login, register, token validation)
  - Document CRUD (`/api/documents` - create, read, update, delete)
  - Project management (`/api/projects`)
  - Chat history (`/api/chat-history`)
  - RAG endpoints (`/api/rag/upload`, `/api/rag/query`)

- [ ] **Integration Tests**
  - Prisma transactions (multi-table operations)
  - Socket.IO event handling
  - SSE streaming (Chat/Research modes)
  - File upload & parsing workflow

- [ ] **Test Utilities**
  - Mock Prisma client for isolated testing
  - Mock Redis with `ioredis-mock`
  - Mock OpenAI API responses
  - Test database setup/teardown

**Target Coverage**: 60%+ for critical paths

#### Frontend Testing
- [ ] **Component Tests** (Vitest + React Testing Library)
  - `ChatBotPanel` - message rendering, SSE streaming
  - `MarkdownEditor` - auto-save, content sync
  - `ProjectSidebar` - drag & drop, project creation
  - `RAGDocumentPanel` - file upload modal

- [ ] **Hook Tests**
  - `useChat` - SSE parsing, error handling
  - `useAutoSave` - debounce logic
  - `useCollaboration` - Socket.IO events

- [ ] **E2E Tests** (Playwright)
  - User journey: Login → Create document → Edit → Export
  - AI chat flow: Ask question → Stream response → Save to history
  - Collaboration: Multi-user editing simulation

**Files to Create**:
```
server/tests/
  ├── unit/
  │   ├── auth.test.ts
  │   ├── document.test.ts
  │   ├── rag.test.ts
  │   └── chatHistory.test.ts
  ├── integration/
  │   ├── sse-streaming.test.ts
  │   └── socket-collaboration.test.ts
  └── helpers/
      ├── mockPrisma.ts
      ├── mockRedis.ts
      └── testServer.ts

client/tests/
  ├── components/
  │   ├── ChatBotPanel.test.tsx
  │   └── MarkdownEditor.test.tsx
  ├── hooks/
  │   └── useChat.test.ts
  └── e2e/
      └── userJourney.spec.ts
```

---

### 🔐 Phase 4B: Permission System (Medium Priority)

**Goal**: Enforce document sharing & access control

#### Backend Implementation
- [ ] **Permission Middleware**
  - Create `lib/permissions.ts` with helpers:
    - `canReadDocument(userId, documentId)` → boolean
    - `canEditDocument(userId, documentId)` → boolean
    - `getSharedUsers(documentId)` → User[]

- [ ] **Apply to Routes**
  - Wrap `/api/documents/:id` GET/PATCH with read/write checks
  - Add permission validation to `/api/chat-history/:documentId`
  - Protect RAG operations (only owners can upload/delete)

- [ ] **Sharing API**
  - `POST /api/documents/:id/share` - Invite user by email
  - `DELETE /api/documents/:id/share/:userId` - Revoke access
  - `GET /api/documents/:id/permissions` - List shared users

#### Frontend Integration
- [ ] **Read-Only Mode**
  - Detect permission in `MarkdownEditor`
  - Disable editor if `permission === 'read'`
  - Show lock icon in toolbar

- [ ] **Share Dialog**
  - New component: `ShareDocumentModal.tsx`
  - Email input + permission dropdown (read/write)
  - Display current shared users with remove option

**Database**: Already exists (`DocumentPermission` model) ✅

---

### 🗄️ Phase 4C: Database Migration Script (Low Priority)

**Goal**: Provide SQLite → PostgreSQL migration path

**Status**: Script already exists at `server/scripts/migrate-sqlite-to-postgres.ts` ✅

**Enhancements Needed**:
- [ ] Add dry-run mode (`--dry-run` flag)
- [ ] Generate backup before migration
- [ ] Add rollback mechanism
- [ ] Progress bar for large datasets
- [ ] Validation report (data integrity checks)

**Usage**:
```bash
cd server
npm run migrate:sqlite-to-postgres -- --dry-run  # Preview
npm run migrate:sqlite-to-postgres              # Execute
```

---

### 🚀 Phase 5: Advanced Features (Future)

#### 5A. Y.js Collaborative Editing
- [ ] Enable `CollaborativeEditor.tsx` (currently unused)
- [ ] Implement cursor position sync (`awareness-update`)
- [ ] Add user presence indicators (colored cursors)
- [ ] Conflict resolution testing

#### 5B. Version History
- [ ] Use existing `Version` model
- [ ] Auto-save snapshots (every 10 edits or 5 minutes)
- [ ] Version comparison UI (diff viewer)
- [ ] Restore to previous version

#### 5C. Multi-Language Support (i18n)
- [ ] Install `react-i18next`
- [ ] Extract UI strings to translation files
- [ ] Support: English, 繁體中文, 简体中文
- [ ] Language switcher in settings

#### 5D. Advanced AI Features
- [ ] AI writing suggestions (inline autocomplete)
- [ ] Grammar & style checker
- [ ] Automatic summarization
- [ ] Tone adjustment (formal/casual)

#### 5E. Enhanced Export
- [ ] Custom PDF templates (headers, footers, page numbers)
- [ ] LaTeX export for academic papers
- [ ] Confluence/Notion export
- [ ] Batch export (multiple documents)

---

### 📊 Phase 6: Performance & Optimization

#### 6A. Frontend Optimization
- [ ] React virtualization for long document lists (`react-window`)
- [ ] Code splitting by route (lazy load components)
- [ ] Image optimization (WebP conversion, lazy loading)
- [ ] Service Worker for offline support (PWA)

#### 6B. Backend Optimization
- [ ] Add caching layer (Redis for document metadata)
- [ ] Database query optimization (analyze slow queries)
- [ ] Implement rate limiting (express-rate-limit)
- [ ] CDN for static assets

#### 6C. Monitoring
- [ ] Add logging (Winston or Pino)
- [ ] Error tracking (Sentry integration)
- [ ] Performance monitoring (APM)
- [ ] Analytics (user behavior tracking)

---

### 🐳 Phase 7: Deployment & DevOps

#### 7A. Containerization
- [ ] Create `Dockerfile` (multi-stage build)
- [ ] `docker-compose.yml` (app + PostgreSQL + Redis)
- [ ] Environment variable management
- [ ] Health check endpoints

#### 7B. CI/CD Pipeline
- [ ] GitHub Actions workflow:
  - Lint → Test → Build → Deploy
  - Automated dependency updates (Dependabot)
  - Security scanning (npm audit)

#### 7C. Production Deployment
- [ ] Deploy to cloud (Vercel/Railway/Fly.io)
- [ ] SSL/TLS certificates (Let's Encrypt)
- [ ] Database backups (daily snapshots)
- [ ] Disaster recovery plan

---

## Priority Matrix

| Phase | Priority | Estimated Time | Dependencies |
|-------|----------|----------------|--------------|
| **4A: Testing** | 🔥 **HIGH** | 2-3 weeks | None |
| **4B: Permissions** | 🟡 MEDIUM | 1 week | Testing framework |
| **4C: Migration** | 🟢 LOW | 2 days | None (optional) |
| **5: Advanced Features** | 🟢 LOW | 4-6 weeks | Phases 4A-4B |
| **6: Optimization** | 🟡 MEDIUM | 2-3 weeks | Phase 5 |
| **7: Deployment** | 🟡 MEDIUM | 1-2 weeks | Phase 6 |

---

## Recommended Next Steps

### This Week (Immediate)
1. ✅ ~~Fix TypeScript errors~~ **DONE**
2. ✅ ~~Setup ESLint~~ **DONE**
3. 🔄 **Start Phase 4A**: Create basic test structure
   - Setup Vitest config
   - Write first auth route test
   - Setup test database

### Next 2 Weeks
4. Complete Phase 4A (Testing Infrastructure)
   - Target: 60% code coverage on critical paths
   - All auth/document/chat routes tested

5. Begin Phase 4B (Permissions)
   - Implement `canReadDocument`/`canEditDocument`
   - Add share API endpoint

### Next Month
6. Finish Phase 4 (Testing + Permissions)
7. Plan Phase 5 feature prioritization
8. Consider deployment strategy (Phase 7)

---

## Success Metrics

### Code Quality (Current: A-)
- TypeScript errors: **0** ✅
- Test coverage: **0% → 60%** (Target)
- ESLint warnings: **24 → <10** (Target)
- Security vulnerabilities: **0** (Maintain)

### Feature Completeness
- Core editing: **100%** ✅
- AI features: **100%** ✅
- Collaboration: **85%** → **100%** (Y.js sync)
- Permissions: **70%** → **100%** (Enforcement)
- Testing: **0%** → **60%+** (Critical paths)

### Production Readiness
- Current: **Development Ready** (B+)
- Target: **Production Ready** (A)
- Required: Phases 4A + 4B + 6B + 7A

---

**Last Updated**: 2025-10-18 (After Bug Fixes: Research graceful degradation + UI stability)
**Next Review**: After Phase 4A completion
