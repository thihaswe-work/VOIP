const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const callRoutes = require('./routes/calls');
const turnRoutes = require('./routes/turn');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/turn', turnRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const userSockets = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'p2p_calling_secret_key_2024');
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  } catch (error) {
    next(new Error('Invalid authentication token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.username})`);

  userSockets.set(socket.userId, socket.id);

  io.emit('user-status', { userId: socket.userId, status: 'online' });

  socket.on('call-user', (data) => {
    const { targetUserId, callType, sdp } = data;
    const targetSocketId = userSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        callerId: socket.userId,
        callerUsername: socket.username,
        callType,
        sdp
      });
    } else {
      socket.emit('call-error', { message: 'User is offline' });
    }
  });

  socket.on('answer-call', (data) => {
    const { callerId, sdp } = data;
    const callerSocketId = userSockets.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-answered', { sdp, answererId: socket.userId });
    }
  });

  socket.on('reject-call', (data) => {
    const { callerId } = data;
    const callerSocketId = userSockets.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected', { rejectedBy: socket.userId });
    }
  });

  socket.on('cancel-call', (data) => {
    const { targetUserId } = data;
    const targetSocketId = userSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-cancelled', { cancelledBy: socket.userId });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { targetUserId, candidate } = data;
    const targetSocketId = userSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', { senderId: socket.userId, candidate });
    }
  });

  socket.on('end-call', (data) => {
    const { targetUserId } = data;
    const targetSocketId = userSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended', { endedBy: socket.userId });
    }
  });

  socket.on('call-timer', (data) => {
    const { targetUserId, duration } = data;
    const targetSocketId = userSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-timer', { senderId: socket.userId, duration });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    userSockets.delete(socket.userId);
    io.emit('user-status', { userId: socket.userId, status: 'offline' });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for signaling`);
});

module.exports = { app, server, io };
