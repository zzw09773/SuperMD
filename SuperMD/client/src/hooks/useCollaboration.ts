import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
}

const useCollaboration = (documentId: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([{ id: 'demo', name: 'You' }]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.emit('join-document', documentId);

    newSocket.on('room-info', ({ userCount }: { userCount: number }) => {
      // Create demo users array based on count
      const usersList: User[] = Array.from({ length: userCount }, (_, i) => ({
        id: `user-${i}`,
        name: i === 0 ? 'You' : `User ${i}`,
      }));
      setUsers(usersList);
    });

    newSocket.on('user-joined', ({ userCount }: { userCount: number }) => {
      const usersList: User[] = Array.from({ length: userCount }, (_, i) => ({
        id: `user-${i}`,
        name: i === 0 ? 'You' : `User ${i}`,
      }));
      setUsers(usersList);
    });

    newSocket.on('user-left', ({ userCount }: { userCount: number }) => {
      const usersList: User[] = Array.from({ length: userCount }, (_, i) => ({
        id: `user-${i}`,
        name: i === 0 ? 'You' : `User ${i}`,
      }));
      setUsers(usersList);
    });

    return () => {
      newSocket.emit('leave-document', documentId);
      newSocket.close();
    };
  }, [documentId]);

  return { socket, users, isConnected };
};

export default useCollaboration;
