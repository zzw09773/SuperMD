import { useState, useEffect } from 'react';
import { Folder, FolderPlus, File, ChevronRight, ChevronDown, Edit2, Trash2, X, Check, Plus } from 'lucide-react';
import { projectAPI, documentAPI, type Project as APIProject, type Document as APIDocument } from '../../services/api';

interface Document extends APIDocument {
  folderId?: string | null;
}

interface Project extends Omit<APIProject, 'documents'> {
  documents: Document[];
}

interface ProjectSidebarProps {
  currentDocumentId: string | null;
  onDocumentSelect: (id: string | null) => void;
  onDocumentCreate?: (doc: Document) => void;
}

// Extract first # heading from markdown content
const extractTitle = (content: string): string => {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
};

const ProjectSidebar = ({
  currentDocumentId,
  onDocumentSelect,
  onDocumentCreate,
}: ProjectSidebarProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ungroupedDocs, setUngroupedDocs] = useState<Document[]>([]);
  const [draggedDoc, setDraggedDoc] = useState<Document | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  // Load projects and documents from backend
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, documentsData] = await Promise.all([
        projectAPI.getAll(),
        documentAPI.getAll(),
      ]);

      // Organize documents into projects and ungrouped
      const projectsWithDocs: Project[] = projectsData.map(project => ({
        ...project,
        documents: documentsData.filter(doc => doc.projectId === project.id),
      }));

      const ungrouped = documentsData.filter(doc => !doc.projectId);

      setProjects(projectsWithDocs);
      setUngroupedDocs(ungrouped);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Optimistic update
    setProjects(projects.map(p =>
      p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p
    ));

    // Sync to backend
    try {
      await projectAPI.update(projectId, { isExpanded: !project.isExpanded });
    } catch (error) {
      console.error('Failed to toggle project:', error);
      // Revert on error
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, isExpanded: project.isExpanded } : p
      ));
    }
  };

  const handleDragStart = (doc: Document) => {
    setDraggedDoc(doc);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnProject = async (projectId: string) => {
    if (!draggedDoc) return;

    // Optimistic update
    setUngroupedDocs(ungroupedDocs.filter(d => d.id !== draggedDoc.id));
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, documents: [...p.documents, { ...draggedDoc, projectId }] }
        : { ...p, documents: p.documents.filter(d => d.id !== draggedDoc.id) }
    ));

    // Sync to backend
    try {
      await documentAPI.move(draggedDoc.id, projectId);
    } catch (error) {
      console.error('Failed to move document:', error);
      // Revert on error
      loadData();
    }

    setDraggedDoc(null);
  };

  const handleDropOnUngrouped = async () => {
    if (!draggedDoc) return;

    // Optimistic update
    setProjects(projects.map(p => ({
      ...p,
      documents: p.documents.filter(d => d.id !== draggedDoc.id),
    })));

    if (!ungroupedDocs.find(d => d.id === draggedDoc.id)) {
      setUngroupedDocs([...ungroupedDocs, { ...draggedDoc, projectId: null }]);
    }

    // Sync to backend
    try {
      await documentAPI.move(draggedDoc.id, null);
    } catch (error) {
      console.error('Failed to move document:', error);
      // Revert on error
      loadData();
    }

    setDraggedDoc(null);
  };

  const addNewProject = async () => {
    try {
      const newProject = await projectAPI.create({ name: '新專案' });
      setProjects([...projects, { ...newProject, documents: [] }]);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const startEditingProject = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditingProjectName(currentName);
  };

  const saveProjectName = async (projectId: string) => {
    if (!editingProjectName.trim()) {
      cancelEditingProject();
      return;
    }

    // Optimistic update
    const oldName = projects.find(p => p.id === projectId)?.name;
    setProjects(projects.map(p =>
      p.id === projectId ? { ...p, name: editingProjectName } : p
    ));
    setEditingProjectId(null);
    setEditingProjectName('');

    // Sync to backend
    try {
      await projectAPI.update(projectId, { name: editingProjectName });
    } catch (error) {
      console.error('Failed to update project:', error);
      // Revert on error
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, name: oldName || p.name } : p
      ));
    }
  };

  const cancelEditingProject = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const deleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (project.documents.length > 0) {
      if (!confirm(`專案 "${project.name}" 內有 ${project.documents.length} 個文件，確定要刪除嗎？`)) {
        return;
      }
    }

    // Optimistic update
    const deletedProject = project;
    setProjects(projects.filter(p => p.id !== projectId));
    if (deletedProject.documents.length > 0) {
      setUngroupedDocs([...ungroupedDocs, ...deletedProject.documents.map(d => ({ ...d, projectId: null }))]);
    }

    // Sync to backend
    try {
      await projectAPI.delete(projectId);
    } catch (error) {
      console.error('Failed to delete project:', error);
      // Revert on error
      loadData();
    }
  };

  const createNewDocument = async () => {
    try {
      const newDoc = await documentAPI.create({
        title: 'Untitled',
        content: '# Untitled\n\nStart writing...',
      });
      setUngroupedDocs([newDoc, ...ungroupedDocs]);
      onDocumentSelect(newDoc.id);
      if (onDocumentCreate) {
        onDocumentCreate(newDoc as any);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const deleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('確定要刪除此文件嗎？')) {
      return;
    }

    // Optimistic update
    setProjects(projects.map(p => ({
      ...p,
      documents: p.documents.filter(d => d.id !== docId),
    })));
    setUngroupedDocs(ungroupedDocs.filter(d => d.id !== docId));

    if (currentDocumentId === docId) {
      onDocumentSelect(null);
    }

    // Sync to backend
    try {
      await documentAPI.delete(docId);
    } catch (error) {
      console.error('Failed to delete document:', error);
      // Revert on error
      loadData();
    }
  };

  // Update document title when content changes
  useEffect(() => {
    // This will be called by parent component when markdown changes
    // For now, we'll update it through props
  }, []);

  if (loading) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SuperMD</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Collaborative Markdown Editor</p>
      </div>

      {/* New Document Button */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={createNewDocument}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Document
        </button>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">專案</h3>
            <button
              onClick={addNewProject}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="新增專案"
            >
              <FolderPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Project List */}
          {projects.map((project) => (
            <div key={project.id} className="mb-2 group">
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnProject(project.id)}
              >
                <button
                  onClick={() => toggleProject(project.id)}
                  className="p-0.5"
                >
                  {project.isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                <Folder className="w-4 h-4 text-blue-500" />

                {/* Project Name - Editable */}
                {editingProjectId === project.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveProjectName(project.id);
                        if (e.key === 'Escape') cancelEditingProject();
                      }}
                      className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded"
                      placeholder="專案名稱"
                      aria-label="專案名稱"
                      autoFocus
                    />
                    <button
                      onClick={() => saveProjectName(project.id)}
                      className="p-0.5 text-green-600 hover:text-green-700"
                      title="儲存"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={cancelEditingProject}
                      className="p-0.5 text-red-600 hover:text-red-700"
                      title="取消"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{project.name}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <button
                        onClick={() => startEditingProject(project.id, project.name)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="重新命名"
                      >
                        <Edit2 className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="刪除專案"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Documents in Project */}
              {project.isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {project.documents.map((doc) => (
                    <div
                      key={doc.id}
                      draggable
                      onDragStart={() => handleDragStart(doc)}
                      onClick={() => onDocumentSelect(doc.id)}
                      className={`group/doc flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                        currentDocumentId === doc.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <File className="w-3 h-3" />
                      <span className="flex-1 text-sm truncate">{extractTitle(doc.content)}</span>
                      <button
                        onClick={(e) => deleteDocument(doc.id, e)}
                        className="opacity-0 group-hover/doc:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="刪除文件"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  ))}
                  {project.documents.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                      拖曳文件到此處
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ungrouped Documents Section */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            未分類文件
          </h3>
          <div
            className="space-y-1"
            onDragOver={handleDragOver}
            onDrop={handleDropOnUngrouped}
          >
            {ungroupedDocs.map((doc) => (
              <div
                key={doc.id}
                draggable
                onDragStart={() => handleDragStart(doc)}
                onClick={() => onDocumentSelect(doc.id)}
                className={`group/doc flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                  currentDocumentId === doc.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <File className="w-3 h-3" />
                <span className="flex-1 text-sm truncate">{extractTitle(doc.content)}</span>
                <button
                  onClick={(e) => deleteDocument(doc.id, e)}
                  className="opacity-0 group-hover/doc:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="刪除文件"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              </div>
            ))}
            {ungroupedDocs.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                暫無未分類文件
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ProjectSidebar;
