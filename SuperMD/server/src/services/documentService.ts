import prisma from '../lib/prisma';
import {
  assertCanEditDocument,
  assertCanReadDocument,
  assertDocumentOwnership,
  listAccessibleDocuments,
} from '../lib/permissions';

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

  return {
    ...document,
    accessLevel: 'owner' as const,
  };
};

/**
 * Get all documents for a user
 */
export const getUserDocuments = async (userId: string) => {
  return listAccessibleDocuments(userId);
};

/**
 * Get a single document by ID
 */
export const getDocumentById = async (documentId: string, userId: string) => {
  const { document, accessLevel } = await assertCanReadDocument(documentId, userId);

  return {
    ...document,
    accessLevel,
  };
};

/**
 * Update a document
 */
export const updateDocument = async (
  documentId: string,
  userId: string,
  data: UpdateDocumentData
) => {
  const { accessLevel } = await assertCanEditDocument(documentId, userId);

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

  return {
    ...updatedDocument,
    accessLevel,
  };
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId: string, userId: string) => {
  await assertDocumentOwnership(documentId, userId);

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
  return updateDocument(documentId, userId, { projectId });
};

export const shareDocumentWithUser = async (
  documentId: string,
  ownerId: string,
  {
    email,
    permission,
  }: {
    email: string;
    permission: 'read' | 'write';
  }
) => {
  const { document } = await assertDocumentOwnership(documentId, ownerId);

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  if (targetUser.id === ownerId) {
    throw new Error('Owner already has full access');
  }

  const result = await prisma.documentPermission.upsert({
    where: {
      documentId_userId: {
        documentId,
        userId: targetUser.id,
      },
    },
    update: {
      permission,
    },
    create: {
      documentId,
      userId: targetUser.id,
      permission,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return {
    document,
    sharedWith: result,
  };
};

export const revokeDocumentShare = async (documentId: string, ownerId: string, permissionId: string) => {
  await assertDocumentOwnership(documentId, ownerId);

  await prisma.documentPermission.delete({
    where: {
      id: permissionId,
    },
  });
};

export const listDocumentShares = async (documentId: string, userId: string) => {
  const { document, accessLevel } = await assertCanReadDocument(documentId, userId);

  return {
    document,
    accessLevel,
    sharedWith: document.permissions,
  };
};
