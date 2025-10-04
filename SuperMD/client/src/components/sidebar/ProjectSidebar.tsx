import { useState, useEffect } from 'react';
import { Folder, FolderPlus, File, ChevronRight, ChevronDown, Edit2, Trash2, X, Check, Plus } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
}

interface Project {
  id: string;
  name: string;
  documents: Document[];
  isExpanded: boolean;
}

interface ProjectSidebarProps {
  currentDocumentId: string | null;
  onDocumentSelect: (id: string) => void;
  onDocumentCreate?: (doc: Document) => void;
  onDocumentUpdate?: (docId: string, title: string) => void;
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
  onDocumentUpdate
}: ProjectSidebarProps) => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'project-1',
      name: '我的專案',
      documents: [],
      isExpanded: true,
    },
  ]);

  const [ungroupedDocs, setUngroupedDocs] = useState<Document[]>([]);
  const [draggedDoc, setDraggedDoc] = useState<Document | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  const toggleProject = (projectId: string) => {
    setProjects(projects.map(p =>
      p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p
    ));
  };

  const handleDragStart = (doc: Document) => {
    setDraggedDoc(doc);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnProject = (projectId: string) => {
    if (!draggedDoc) return;

    // Remove from ungrouped
    setUngroupedDocs(ungroupedDocs.filter(d => d.id !== draggedDoc.id));

    // Add to project
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, documents: [...p.documents, { ...draggedDoc, folderId: projectId }] }
        : { ...p, documents: p.documents.filter(d => d.id !== draggedDoc.id) }
    ));

    setDraggedDoc(null);
  };

  const handleDropOnUngrouped = () => {
    if (!draggedDoc) return;

    // Remove from all projects
    setProjects(projects.map(p => ({
      ...p,
      documents: p.documents.filter(d => d.id !== draggedDoc.id),
    })));

    // Add to ungrouped (if not already there)
    if (!ungroupedDocs.find(d => d.id === draggedDoc.id)) {
      setUngroupedDocs([...ungroupedDocs, { ...draggedDoc, folderId: null }]);
    }

    setDraggedDoc(null);
  };

  const addNewProject = () => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: '新專案',
      documents: [],
      isExpanded: true,
    };
    setProjects([...projects, newProject]);
  };

  const startEditingProject = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditingProjectName(currentName);
  };

  const saveProjectName = (projectId: string) => {
    setProjects(projects.map(p =>
      p.id === projectId ? { ...p, name: editingProjectName || p.name } : p
    ));
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const cancelEditingProject = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const deleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project && project.documents.length > 0) {
      if (!confirm(`專案 "${project.name}" 內有 ${project.documents.length} 個文件，確定要刪除嗎？`)) {
        return;
      }
      // Move documents to ungrouped
      setUngroupedDocs([...ungroupedDocs, ...project.documents.map(d => ({ ...d, folderId: null }))]);
    }
    setProjects(projects.filter(p => p.id !== projectId));
  };

  const createNewDocument = () => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: 'Untitled',
      content: '# Untitled\n\nStart writing...',
      folderId: null,
    };
    setUngroupedDocs([newDoc, ...ungroupedDocs]);
    onDocumentSelect(newDoc.id);
    if (onDocumentCreate) {
      onDocumentCreate(newDoc);
    }
  };

  // Update document title when content changes
  useEffect(() => {
    // This will be called by parent component when markdown changes
    // For now, we'll update it through props
  }, []);

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
                      autoFocus
                    />
                    <button
                      onClick={() => saveProjectName(project.id)}
                      className="p-0.5 text-green-600 hover:text-green-700"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={cancelEditingProject}
                      className="p-0.5 text-red-600 hover:text-red-700"
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
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                        currentDocumentId === doc.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <File className="w-3 h-3" />
                      <span className="flex-1 text-sm truncate">{extractTitle(doc.content)}</span>
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
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                  currentDocumentId === doc.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <File className="w-3 h-3" />
                <span className="flex-1 text-sm truncate">{extractTitle(doc.content)}</span>
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
