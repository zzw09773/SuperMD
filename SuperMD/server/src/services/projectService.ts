import prisma from '../lib/prisma';

interface CreateProjectData {
  name: string;
  description?: string;
  color?: string;
  userId: string;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  color?: string;
  isExpanded?: boolean;
}

/**
 * Create a new project
 */
export const createProject = async (data: CreateProjectData) => {
  const { name, description, color = '#3498db', userId } = data;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      color,
      userId,
    },
    include: {
      documents: true,
    },
  });

  return project;
};

/**
 * Get all projects for a user
 */
export const getUserProjects = async (userId: string) => {
  const projects = await prisma.project.findMany({
    where: {
      userId,
    },
    include: {
      documents: {
        orderBy: {
          updatedAt: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return projects;
};

/**
 * Get a single project by ID
 */
export const getProjectById = async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      documents: {
        orderBy: {
          updatedAt: 'desc',
        },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  return project;
};

/**
 * Update a project
 */
export const updateProject = async (
  projectId: string,
  userId: string,
  data: UpdateProjectData
) => {
  // Verify ownership
  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  });

  if (!existingProject) {
    throw new Error('Project not found or access denied');
  }

  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isExpanded !== undefined && { isExpanded: data.isExpanded }),
    },
    include: {
      documents: true,
    },
  });

  return updatedProject;
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId: string, userId: string) => {
  // Verify ownership
  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      documents: true,
    },
  });

  if (!existingProject) {
    throw new Error('Project not found or access denied');
  }

  // Move documents to ungrouped (set projectId to null)
  if (existingProject.documents.length > 0) {
    await prisma.document.updateMany({
      where: {
        projectId: projectId,
      },
      data: {
        projectId: null,
      },
    });
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  return {
    message: 'Project deleted successfully',
    movedDocuments: existingProject.documents.length,
  };
};
