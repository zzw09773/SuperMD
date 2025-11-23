import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth';
import documentsRouter from './routes/documents';
import foldersRouter from './routes/folders';
import chatRouter from './routes/chat';
import researchRouter from './routes/research';
import exportRouter from './routes/export';
import documentRouter from './routes/document';
import projectRouter from './routes/project';
import ragRouter from './routes/rag';
import chatHistoryRouter from './routes/chatHistory';
import uploadRouter from './routes/upload';
import { initializePgVector } from './lib/pgvector';
import { initializeRedis } from './lib/redis';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be served
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // Limit each IP to 1000 requests per window (increased for realtime app)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow both ports
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Socket.io setup for real-time collaboration
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow both ports
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store active documents and their connections
const activeDocuments = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  logger.info(`[Socket] Client connected: ${socket.id}`);

  // Join document room
  socket.on('join-document', (documentId: string) => {
    socket.join(documentId);

    if (!activeDocuments.has(documentId)) {
      activeDocuments.set(documentId, new Set());
    }
    activeDocuments.get(documentId)!.add(socket.id);

    logger.info(`[Socket] Client ${socket.id} joined document: ${documentId}`);
    logger.info(`[Socket] Active users in ${documentId}: ${activeDocuments.get(documentId)!.size}`);

    // Notify others in the room
    socket.to(documentId).emit('user-joined', {
      userId: socket.id,
      userCount: activeDocuments.get(documentId)!.size,
    });

    // Send current user count to the new user
    socket.emit('room-info', {
      documentId,
      userCount: activeDocuments.get(documentId)!.size,
    });
  });

  // Leave document room
  socket.on('leave-document', (documentId: string) => {
    socket.leave(documentId);

    if (activeDocuments.has(documentId)) {
      activeDocuments.get(documentId)!.delete(socket.id);

      if (activeDocuments.get(documentId)!.size === 0) {
        activeDocuments.delete(documentId);
      } else {
        // Notify others
        socket.to(documentId).emit('user-left', {
          userId: socket.id,
          userCount: activeDocuments.get(documentId)!.size,
        });
      }
    }

    logger.info(`[Socket] Client ${socket.id} left document: ${documentId}`);
  });

  // Handle Y.js sync messages
  socket.on('sync-update', ({ documentId, update }: { documentId: string; update: Uint8Array }) => {
    // Broadcast to all other clients in the document room
    socket.to(documentId).emit('sync-update', { update });
  });

  // Handle sync request from new client
  socket.on('sync-request', ({ documentId }: { documentId: string }) => {
    // Ask others to send their state
    socket.to(documentId).emit('sync-request', { requesterId: socket.id });
  });

  // Handle sync response (full state) from another client
  socket.on('sync-response', ({ targetId, update }: { targetId: string; update: Uint8Array }) => {
    // Send state to the requester
    io.to(targetId).emit('sync-update', { update });
  });

  // Handle awareness updates (cursor position, selection)
  socket.on('awareness-update', ({ documentId, update }: { documentId: string; update: Uint8Array }) => {
    socket.to(documentId).emit('awareness-update', { update });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`[Socket] Client disconnected: ${socket.id}`);

    // Clean up from all document rooms
    activeDocuments.forEach((clients, documentId) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id);

        if (clients.size === 0) {
          activeDocuments.delete(documentId);
        } else {
          // Notify others
          socket.to(documentId).emit('user-left', {
            userId: socket.id,
            userCount: clients.size,
          });
        }
      }
    });
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SuperMD Server',
    activeDocuments: activeDocuments.size,
  });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'SuperMD API Server',
    version: '0.1.0',
  });
});

// Register resource routes
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/document', documentRouter); // New Prisma-based document routes
app.use('/api/projects', projectRouter); // New Prisma-based project routes
app.use('/api/folders', foldersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/research', researchRouter);
app.use('/api/export', exportRouter);
app.use('/api/rag', ragRouter); // Agentic RAG routes
app.use('/api/chat-history', chatHistoryRouter); // Chat history routes
app.use('/api', uploadRouter); // Upload routes (image upload)

// Global Error Handler
app.use(errorHandler);

// Start server and initialize pgvector
httpServer.listen(PORT, async () => {
  logger.info(`🚀 SuperMD Server running on http://localhost:${PORT}`);
  logger.info(`💚 Health check: http://localhost:${PORT}/health`);
  logger.info(`📡 API endpoint: http://localhost:${PORT}/api`);
  logger.info(`🔌 WebSocket server ready`);

  // Initialize Redis cache
  await initializeRedis();

  // Initialize PostgreSQL pgvector
  try {
    await initializePgVector();
    logger.info(`🧠 Agentic RAG system ready`);
  } catch (error) {
    logger.error(`⚠️  PgVector initialization failed. RAG features may not work.`);
    logger.error(`   Make sure PostgreSQL is running with pgvector extension installed.`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});
