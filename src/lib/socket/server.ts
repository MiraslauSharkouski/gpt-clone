import { Server, ServerOptions } from 'socket.io';

let io: Server | null = null;

/**
 * Initialize Socket.IO server
 * Call this in your custom server or API route
 */
export function initSocketIO(options?: Partial<ServerOptions>): Server {
  if (io) {
    return io;
  }

  io = new Server({
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    adapter: process.env.SOCKET_IO_REDIS_URL
      ? await import('@socket.io/redis-adapter').then((m) => {
          const { createAdapter } = m;
          const { createClient } = require('redis');
          const pubClient = createClient({ url: process.env.SOCKET_IO_REDIS_URL });
          const subClient = pubClient.duplicate();
          Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
            return createAdapter(pubClient, subClient);
          });
        })
      : undefined,
    ...options,
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Subscribe to chat room
    socket.on('subscribe:chat', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      console.log(`Client ${socket.id} subscribed to chat:${chatId}`);
    });

    // Unsubscribe from chat room
    socket.on('unsubscribe:chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      console.log(`Client ${socket.id} unsubscribed from chat:${chatId}`);
    });

    // Broadcast message to chat room
    socket.on('message:sent', (data: { chatId: string; messageId: string; content: string; role: string }) => {
      socket.to(`chat:${data.chatId}`).emit('chat:updated', {
        type: 'message:sent',
        data,
      });
    });

    // Broadcast typing status
    socket.on('user:typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
      socket.to(`chat:${data.chatId}`).emit('user:typing', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getSocketIO(): Server | null {
  return io;
}
