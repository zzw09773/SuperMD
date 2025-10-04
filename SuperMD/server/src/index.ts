import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import documentsRouter from './routes/documents';
import foldersRouter from './routes/folders';
import chatRouter from './routes/chat';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow both ports
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join document room
  socket.on('join-document', (documentId: string) => {
    socket.join(documentId);

    if (!activeDocuments.has(documentId)) {
      activeDocuments.set(documentId, new Set());
    }
    activeDocuments.get(documentId)!.add(socket.id);

    console.log(`[Socket] Client ${socket.id} joined document: ${documentId}`);
    console.log(`[Socket] Active users in ${documentId}: ${activeDocuments.get(documentId)!.size}`);

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

    console.log(`[Socket] Client ${socket.id} left document: ${documentId}`);
  });

  // Handle Y.js sync messages
  socket.on('sync-update', ({ documentId, update }: { documentId: string; update: Uint8Array }) => {
    // Broadcast to all other clients in the document room
    socket.to(documentId).emit('sync-update', { update });
  });

  // Handle awareness updates (cursor position, selection)
  socket.on('awareness-update', ({ documentId, update }: { documentId: string; update: Uint8Array }) => {
    socket.to(documentId).emit('awareness-update', { update });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);

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
app.use('/api/documents', documentsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/chat', chatRouter);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 SuperMD Server running on http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});
