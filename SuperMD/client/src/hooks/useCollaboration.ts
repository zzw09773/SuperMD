import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const useCollaboration = (documentId: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userCount, setUserCount] = useState(1);

  useEffect(() => {
    if (!documentId) return;

    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.emit('join-document', documentId);

    newSocket.on('room-info', ({ userCount }: { userCount: number }) => {
      setUserCount(userCount);
    });

    newSocket.on('user-joined', ({ userCount }: { userCount: number }) => {
      setUserCount(userCount);
    });

    newSocket.on('user-left', ({ userCount }: { userCount: number }) => {
      setUserCount(userCount);
    });

    return () => {
      newSocket.emit('leave-document', documentId);
      newSocket.close();
    };
  }, [documentId]);

  return { socket, userCount };
};

export default useCollaboration;
