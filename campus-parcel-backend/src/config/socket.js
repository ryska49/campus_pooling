let io;

const EVENTS = {
  NEW_REQUEST: 'new_request',
  REQUEST_ACCEPTED: 'request_accepted',
  DELIVERY_COMPLETED: 'delivery_completed',
  REQUEST_CANCELLED: 'request_cancelled',
};

const initSocket = (server) => {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Allow clients to join a personal room by userId
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToAll = (event, data) => {
  getIO().emit(event, data);
};

const emitToUser = (userId, event, data) => {
  getIO().to(userId.toString()).emit(event, data);
};

module.exports = { initSocket, getIO, emitToAll, emitToUser, EVENTS };
