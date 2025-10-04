export interface Document {
  id: string;
  title: string;
  content: string;
  tags: string;
  folderId: string | null;
  userId: string;
  createdAt: string;
  lastEditedAt: string;
  updatedAt: string;
  folder?: Folder;
  versions?: Version[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
  documents?: Document[];
}

export interface Version {
  id: string;
  documentId: string;
  content: string;
  version: number;
  createdBy: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SaveStatus {
  status: 'saved' | 'saving' | 'error';
  lastSaved?: Date;
}
