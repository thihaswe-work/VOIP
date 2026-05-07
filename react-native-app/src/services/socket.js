import { io } from 'socket.io-client';
import { getStoredToken } from './api';

const SOCKET_URL = 'http://localhost:3000';

let socket = null;

export const connectSocket = async () => {
  const token = await getStoredToken();
  if (!token) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export default { connectSocket, disconnectSocket, getSocket };
