import { Prisma } from '@prisma/client';
import prisma from './prisma';

export type DocumentAccessLevel = 'owner' | 'write' | 'read';

const baseDocumentInclude = Prisma.validator<Prisma.DocumentInclude>()({
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
});

type DocumentWithRelations = Prisma.DocumentGetPayload<{ include: typeof baseDocumentInclude }>;

interface DocumentAccessResult {
  document: DocumentWithRelations;
  accessLevel: DocumentAccessLevel;
}

export const computeAccessLevel = (document: { userId: string; permissions: Array<{ userId: string; permission: string }> }, userId: string): DocumentAccessLevel => {
  if (document.userId === userId) {
    return 'owner';
  }

  const match = document.permissions.find((permission) => permission.userId === userId);
  if (!match) {
    throw new Error('Access denied');
  }

  return match.permission === 'write' ? 'write' : 'read';
};

export const ensureDocumentAccess = async (documentId: string, userId: string): Promise<DocumentAccessResult> => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: baseDocumentInclude,
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const accessLevel = computeAccessLevel(document, userId);
  return { document, accessLevel };
};

export const assertCanReadDocument = ensureDocumentAccess;

export const assertCanEditDocument = async (documentId: string, userId: string): Promise<DocumentAccessResult> => {
  const { document, accessLevel } = await ensureDocumentAccess(documentId, userId);

  if (accessLevel === 'read') {
    throw new Error('Write permission required');
  }

  return { document, accessLevel };
};

export const assertDocumentOwnership = async (documentId: string, userId: string): Promise<DocumentAccessResult> => {
  const { document, accessLevel } = await ensureDocumentAccess(documentId, userId);

  if (accessLevel !== 'owner') {
    throw new Error('Only the owner can perform this action');
  }

  return { document, accessLevel };
};

export const listAccessibleDocuments = async (userId: string) => {
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { userId },
        {
          permissions: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    include: baseDocumentInclude,
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return documents.map((document) => ({
    ...document,
    accessLevel: computeAccessLevel(document, userId),
  }));
};
