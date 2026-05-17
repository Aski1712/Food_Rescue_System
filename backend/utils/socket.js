import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket for later use
      socket.user = user;
      socket.userId = user._id;
      socket.userRole = user.role;

      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected with socket ${socket.id}`);

    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('joinRole', (role) => {
      socket.join(role); // Join role-based room (NGO, Volunteer, etc.)
      console.log(`Socket ${socket.id} joined role: ${role}`);
    });

    socket.on('joinDonation', (donationId) => {
      socket.join(`donation-${donationId}`);
      console.log(`Socket ${socket.id} joined donation: ${donationId}`);
    });

    socket.on('volunteerLocation', ({ deliveryId, location }) => {
      io.to(`delivery-${deliveryId}`).emit('volunteerUpdate', { deliveryId, location, userId: socket.userId });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected with socket ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.userId}:`, error);
    });
  });
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
