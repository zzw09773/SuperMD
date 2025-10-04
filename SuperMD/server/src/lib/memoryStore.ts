interface Document {
  id: string;
  title: string;
  content: string;
  userId: string;
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Folder {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

class MemoryStore {
  private documents: Map<string, Document> = new Map();
  private folders: Map<string, Folder> = new Map();

  constructor() {
    // Initialize with a demo document
    const demoDoc: Document = {
      id: 'demo-document',
      title: 'Demo Document',
      content: `# Welcome to SuperMD

SuperMD is an advanced Markdown notebook with **deep research** and **agentic RAG** capabilities.

## Features

### Phase 1: Markdown Editor ✅
- Rich Markdown editing with CodeMirror 6
- Live preview with unified/remark/rehype
- Syntax highlighting
- GitHub Flavored Markdown support
- **Mermaid diagram rendering**
- **Math equation support (KaTeX)**
- **Auto-save functionality** 💾
- **GPT-5 AI Assistant** 🤖
- **Export to PDF, DOCX, MD, TXT** 📤
- **Keyboard shortcuts** ⌨️

### Phase 2: Deep Research ✅
- AI-powered research assistant
- ReAct agent with LangGraph
- Google Search integration
- Multi-turn reasoning
- Source tracking

### Phase 3: Agentic RAG 🚧
- Vector similarity search
- Intelligent document retrieval
- Collection management
- Smart chunking strategies

Try it out!`,
      userId: 'demo-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.documents.set(demoDoc.id, demoDoc);
    console.log('[MemoryStore] Initialized with demo document');
  }

  // Document methods
  async createDocument(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    const doc: Document = {
      id: `doc-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.documents.set(doc.id, doc);
    return doc;
  }

  async getDocument(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async updateDocument(id: string, data: Partial<Omit<Document, 'id' | 'createdAt'>>): Promise<Document | null> {
    const doc = this.documents.get(id);
    if (!doc) return null;

    const updated: Document = {
      ...doc,
      ...data,
      updatedAt: new Date(),
    };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  async listDocuments(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter((doc) => doc.userId === userId);
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.documents.values()).filter(
      (doc) =>
        doc.userId === userId &&
        (doc.title.toLowerCase().includes(lowerQuery) || doc.content.toLowerCase().includes(lowerQuery))
    );
  }

  // Folder methods
  async createFolder(data: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    const folder: Folder = {
      id: `folder-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.folders.set(folder.id, folder);
    return folder;
  }

  async getFolder(id: string): Promise<Folder | null> {
    return this.folders.get(id) || null;
  }

  async updateFolder(id: string, data: Partial<Omit<Folder, 'id' | 'createdAt'>>): Promise<Folder | null> {
    const folder = this.folders.get(id);
    if (!folder) return null;

    const updated: Folder = {
      ...folder,
      ...data,
      updatedAt: new Date(),
    };
    this.folders.set(id, updated);
    return updated;
  }

  async deleteFolder(id: string): Promise<boolean> {
    return this.folders.delete(id);
  }

  async listFolders(userId: string): Promise<Folder[]> {
    return Array.from(this.folders.values()).filter((folder) => folder.userId === userId);
  }
}

export const memoryStore = new MemoryStore();
