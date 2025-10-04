import { useState } from 'react';
import { Folder, FolderPlus, File, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';

interface Document {
  id: string;
  title: string;
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
}

const ProjectSidebar = ({ currentDocumentId, onDocumentSelect }: ProjectSidebarProps) => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'project-1',
      name: '我的專案',
      documents: [
        { id: 'doc-1', title: 'Demo Document', folderId: 'project-1' },
      ],
      isExpanded: true,
    },
  ]);

  const [ungroupedDocs, setUngroupedDocs] = useState<Document[]>([
    { id: 'doc-2', title: '未分類文件 1', folderId: null },
    { id: 'doc-3', title: '未分類文件 2', folderId: null },
  ]);

  const [draggedDoc, setDraggedDoc] = useState<Document | null>(null);

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

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SuperMD</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Collaborative Markdown Editor</p>
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
            <div key={project.id} className="mb-2">
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{project.name}</span>
                <button className="p-0.5 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
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
                      <span className="flex-1 text-sm truncate">{doc.title}</span>
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
                <span className="flex-1 text-sm truncate">{doc.title}</span>
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
