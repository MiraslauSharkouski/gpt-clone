'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface UseSocketOptions {
  chatId?: string;
  userId?: string;
  onChatUpdate?: (data: unknown) => void;
  onUserTyping?: (data: { userId: string; isTyping: boolean }) => void;
}

/**
 * Hook for Socket.IO connection and cross-tab sync
 */
export function useSocket(options: UseSocketOptions = {}) {
  const { chatId, userId, onChatUpdate, onUserTyping } = options;
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      isConnectedRef.current = true;
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      isConnectedRef.current = false;
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Subscribe to chat updates
  useEffect(() => {
    if (!chatId || !socketRef.current) return;

    const socket = socketRef.current;

    socket.emit('subscribe:chat', chatId);

    socket.on('chat:updated', (data) => {
      if (onChatUpdate) {
        onChatUpdate(data);
      }
    });

    socket.on('user:typing', (data) => {
      if (onUserTyping) {
        onUserTyping(data);
      }
    });

    return () => {
      socket.off('chat:updated');
      socket.off('user:typing');
      socket.emit('unsubscribe:chat', chatId);
    };
  }, [chatId, onChatUpdate, onUserTyping]);

  // Broadcast message sent
  const broadcastMessage = useCallback((message: {
    chatId: string;
    messageId: string;
    content: string;
    role: string;
  }) => {
    socketRef.current?.emit('message:sent', message);
  }, []);

  // Broadcast typing status
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (chatId && userId) {
      socketRef.current?.emit('user:typing', {
        chatId,
        userId,
        isTyping,
      });
    }
  }, [chatId, userId]);

  return {
    isConnected: isConnectedRef.current,
    broadcastMessage,
    broadcastTyping,
  };
}
