import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from server/.env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type SupportedPermission = 'read' | 'write';

const SQLITE_URL = process.env.SQLITE_URL || 'file:./dev.db';
const POSTGRES_URL = process.env.DATABASE_URL;

if (!POSTGRES_URL) {
  console.error('❌ DATABASE_URL is not defined. Please set it in your environment before running the migration.');
  process.exit(1);
}

const sqliteClient = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } });
const postgresClient = new PrismaClient();

async function migrate() {
  console.log('🚚 Starting SQLite → PostgreSQL migration');
  console.log(`   • SQLite source:    ${SQLITE_URL}`);
  console.log(`   • PostgreSQL target: ${POSTGRES_URL}`);

  try {
    const [users, folders, projects, documents, permissions, versions, chatMessages] = await Promise.all([
      sqliteClient.user.findMany(),
      sqliteClient.folder.findMany(),
      sqliteClient.project.findMany(),
      sqliteClient.document.findMany(),
      sqliteClient.documentPermission.findMany(),
      sqliteClient.version.findMany(),
      sqliteClient.chatMessage.findMany(),
    ]);

    console.log('📦 Data snapshot');
    console.log(`   • Users:              ${users.length}`);
    console.log(`   • Folders:            ${folders.length}`);
    console.log(`   • Projects:           ${projects.length}`);
    console.log(`   • Documents:          ${documents.length}`);
    console.log(`   • DocumentPermission: ${permissions.length}`);
    console.log(`   • Versions:           ${versions.length}`);
    console.log(`   • ChatMessages:       ${chatMessages.length}`);

    // Run as a single transaction on Postgres side
    await postgresClient.$transaction(async (tx) => {
      console.log('🧹 Cleaning target database (TRUNCATE)');
      await tx.$executeRawUnsafe('
        TRUNCATE TABLE "ChatMessage", "Version", "DocumentPermission", "Document", "Project", "Folder", "User" RESTART IDENTITY CASCADE;
      ');

      if (users.length) {
        console.log('➡️  Seeding users');
        await tx.user.createMany({ data: users });
      }

      if (folders.length) {
        console.log('➡️  Seeding folders');
        await tx.folder.createMany({ data: folders });
      }

      if (projects.length) {
        console.log('➡️  Seeding projects');
        await tx.project.createMany({ data: projects });
      }

      if (documents.length) {
        console.log('➡️  Seeding documents');
        await tx.document.createMany({ data: documents });
      }

      if (permissions.length) {
        console.log('➡️  Seeding document permissions');
        const filtered = permissions.map((perm) => ({
          ...perm,
          permission: (perm.permission as SupportedPermission) || 'read',
        }));
        await tx.documentPermission.createMany({ data: filtered });
      }

      if (versions.length) {
        console.log('➡️  Seeding document versions');
        await tx.version.createMany({ data: versions });
      }

      if (chatMessages.length) {
        console.log('➡️  Seeding chat history');
        await tx.chatMessage.createMany({ data: chatMessages });
      }
    });

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

migrate();
