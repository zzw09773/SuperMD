import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ================== Project API ==================

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  isExpanded: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
}

export const projectAPI = {
  // Get all projects for current user
  getAll: async (): Promise<Project[]> => {
    const response = await api.get('/projects');
    return response.data.projects;
  },

  // Get single project by ID
  getById: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data.project;
  },

  // Create new project
  create: async (data: { name: string; description?: string; color?: string }): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data.project;
  },

  // Update project
  update: async (
    id: string,
    data: { name?: string; description?: string; color?: string; isExpanded?: boolean }
  ): Promise<Project> => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data.project;
  },

  // Delete project
  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

// ================== Document API ==================

export interface Document {
  id: string;
  title: string;
  content: string;
  tags?: string;
  folderId?: string | null;
  projectId?: string | null;
  userId: string;
  isPublic: boolean;
  createdAt: string;
  lastEditedAt: string;
  updatedAt: string;
  project?: Project | null;
}

export const documentAPI = {
  // Get all documents for current user
  getAll: async (): Promise<Document[]> => {
    const response = await api.get('/document');
    return response.data.documents;
  },

  // Get single document by ID
  getById: async (id: string): Promise<Document> => {
    const response = await api.get(`/document/${id}`);
    return response.data.document;
  },

  // Create new document
  create: async (data: {
    title: string;
    content?: string;
    projectId?: string | null;
  }): Promise<Document> => {
    const response = await api.post('/document', data);
    return response.data.document;
  },

  // Update document
  update: async (
    id: string,
    data: { title?: string; content?: string; projectId?: string | null }
  ): Promise<Document> => {
    const response = await api.patch(`/document/${id}`, data);
    return response.data.document;
  },

  // Delete document
  delete: async (id: string): Promise<void> => {
    await api.delete(`/document/${id}`);
  },

  // Move document to a project (or ungrouped if projectId is null)
  move: async (id: string, projectId: string | null): Promise<Document> => {
    const response = await api.patch(`/document/${id}/move`, { projectId });
    return response.data.document;
  },
};

export default api;
