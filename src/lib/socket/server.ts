// Socket.IO server setup (optional - for cross-tab sync)
// This file is for reference if you want to set up a separate WebSocket server

// For Vercel deployment, use Supabase Realtime instead:
// https://supabase.com/docs/guides/realtime

// If you want to use Socket.IO, create a separate server:
/*
import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe:chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
  });

  socket.on('unsubscribe:chat', (chatId: string) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on('message:sent', (data: { chatId: string; messageId: string; content: string; role: string }) => {
    socket.to(`chat:${data.chatId}`).emit('chat:updated', {
      type: 'message:sent',
      data,
    });
  });

  socket.on('user:typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
    socket.to(`chat:${data.chatId}`).emit('user:typing', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export { io, server };
*/

// For now, cross-tab sync is handled by Supabase Realtime
export function initSocketIO() {
  console.log(
    "Socket.IO server not configured - using Supabase Realtime instead",
  );
  return null;
}

export function getSocketIO() {
  return null;
}
