import prisma from '../lib/prisma';

interface CreateDocumentData {
  title: string;
  content?: string;
  projectId?: string;
  userId: string;
}

interface UpdateDocumentData {
  title?: string;
  content?: string;
  projectId?: string | null;
}

/**
 * Create a new document
 */
export const createDocument = async (data: CreateDocumentData) => {
  const { title, content = '', projectId, userId } = data;

  const document = await prisma.document.create({
    data: {
      title,
      content,
      projectId: projectId || null,
      userId,
    },
    include: {
      project: true,
    },
  });

  return document;
};

/**
 * Get all documents for a user
 */
export const getUserDocuments = async (userId: string) => {
  const documents = await prisma.document.findMany({
    where: {
      userId,
    },
    include: {
      project: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return documents;
};

/**
 * Get a single document by ID
 */
export const getDocumentById = async (documentId: string, userId: string) => {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
    include: {
      project: true,
      permissions: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  return document;
};

/**
 * Update a document
 */
export const updateDocument = async (
  documentId: string,
  userId: string,
  data: UpdateDocumentData
) => {
  // Verify ownership
  const existingDoc = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
  });

  if (!existingDoc) {
    throw new Error('Document not found or access denied');
  }

  const updatedDocument = await prisma.document.update({
    where: {
      id: documentId,
    },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
    },
    include: {
      project: true,
    },
  });

  return updatedDocument;
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId: string, userId: string) => {
  // Verify ownership
  const existingDoc = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
  });

  if (!existingDoc) {
    throw new Error('Document not found or access denied');
  }

  await prisma.document.delete({
    where: {
      id: documentId,
    },
  });

  return { message: 'Document deleted successfully' };
};

/**
 * Move document to a project (or ungrouped)
 */
export const moveDocumentToProject = async (
  documentId: string,
  userId: string,
  projectId: string | null
) => {
  return await updateDocument(documentId, userId, { projectId });
};
