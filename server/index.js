import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Chat room management
const waitingUsers = {
  text: [],
  audio: [],
  video: []
};

const activeRooms = new Map(); // roomId -> {user1, user2}
let roomCounter = 1;

// Function to generate unique room ID
function generateRoomId() {
  return `room_${roomCounter++}`;
}

// Function to find and pair users
function findPartner(socket, chatMode) {
  if (waitingUsers[chatMode].length === 0) {
    // No one waiting, add user to wait list
    waitingUsers[chatMode].push(socket);
    return null;
  }

  // Find a partner (exclude yourself if you're somehow in the list)
  const partner = waitingUsers[chatMode].find(user => user.id !== socket.id);

  if (partner) {
    // Remove partner from waiting list
    waitingUsers[chatMode] = waitingUsers[chatMode].filter(user => user.id !== partner.id);

    // Create room
    const roomId = generateRoomId();
    activeRooms.set(roomId, { user1: socket, user2: partner });

    return { partner: partner, roomId: roomId };
  } else {
    // Still no partner, add to wait list
    waitingUsers[chatMode].push(socket);
    return null;
  }
}

// Function to clean up room when a user disconnects
function cleanupRoom(socket) {
  // Find which room this user was in
  for (const [roomId, room] of activeRooms.entries()) {
    if (room.user1.id === socket.id) {
      // Notify partner and clean up
      room.user2.emit('partnerDisconnected', { reason: 'partner_left' });
      room.user2.leave(roomId);
      activeRooms.delete(roomId);
      break;
    } else if (room.user2.id === socket.id) {
      // Notify partner and clean up
      room.user1.emit('partnerDisconnected', { reason: 'partner_left' });
      room.user1.leave(roomId);
      activeRooms.delete(roomId);
      break;
    }
  }

  // Remove from all waiting lists
  Object.keys(waitingUsers).forEach(chatMode => {
    waitingUsers[chatMode] = waitingUsers[chatMode].filter(user => user.id !== socket.id);
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining a chat mode
  socket.on('joinChat', (data) => {
    const { chatMode } = data; // 'text', 'audio', or 'video'

    if (!['text', 'audio', 'video'].includes(chatMode)) {
      socket.emit('error', { message: 'Invalid chat mode' });
      return;
    }

    console.log(`User ${socket.id} joined ${chatMode} chat`);

    // Try to find a partner
    const match = findPartner(socket, chatMode);

    if (match) {
      const { partner, roomId } = match;

      // Join both users to the room
      socket.join(roomId);
      partner.join(roomId);

      // Provide initial system message
      const systemMessage = {
        id: Date.now() + '_system',
        text: "You're now connected to a stranger. Say hi!",
        sender: 'system',
        timestamp: new Date().toISOString()
      };

      // Tell both users they're connected
      socket.emit('connected', {
        roomId,
        partnerId: partner.id,
        chatMode,
        initialMessage: systemMessage
      });

      partner.emit('connected', {
        roomId,
        partnerId: socket.id,
        chatMode,
        initialMessage: systemMessage
      });

      console.log(`Paired users ${socket.id} and ${partner.id} in room ${roomId}`);
    } else {
      // User is waiting for a partner
      socket.emit('waiting', { message: 'Looking for a stranger to chat with...' });
    }

    // Set user chat mode for cleanup purposes
    socket.chatMode = chatMode;
  });

  // Handle messages from users
  socket.on('message', (data) => {
    const { roomId, message, type = 'text' } = data;


    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);

      // Determine which user is sending and who should receive
      let targetUser;
      if (room.user1.id === socket.id) {
        targetUser = room.user2;
      } else if (room.user2.id === socket.id) {
        targetUser = room.user1;
      }

      if (targetUser) {
        // Forward message to partner
        targetUser.emit('message', {
          roomId,
          message: {
            id: Date.now() + '_' + socket.id,
            text: message,
            sender: 'stranger',
            type: type || 'text',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  });

  // Handle user finding new stranger
  socket.on('findNewPartner', (data) => {
    const { oldRoomId, chatMode } = data;

    // Leave old room if exists
    if (oldRoomId && (socket.rooms.has(oldRoomId) || activeRooms.has(oldRoomId))) {
      socket.leave(oldRoomId);

      // Clean up old room
      if (activeRooms.has(oldRoomId)) {
        const oldRoom = activeRooms.get(oldRoomId);

        // Notify partner
        const partner = (oldRoom.user1.id === socket.id) ? oldRoom.user2 : oldRoom.user1;
        partner.emit('partnerDisconnected', { reason: 'partner_found_new' });
        partner.leave(oldRoomId);

        activeRooms.delete(oldRoomId);
      }
    }

    // Try to find new partner
    const match = findPartner(socket, chatMode);

    if (match) {
      const { partner, roomId } = match;

      // Join both to new room
      socket.join(roomId);
      partner.join(roomId);

      // Provide initial system message for new match
      const systemMessage = {
        id: Date.now() + '_system_new',
        text: "Connected to a new stranger!",
        sender: 'system',
        timestamp: new Date().toISOString()
      };

      socket.emit('connected', {
        roomId,
        partnerId: partner.id,
        chatMode,
        initialMessage: systemMessage
      });

      partner.emit('connected', {
        roomId,
        partnerId: socket.id,
        chatMode,
        initialMessage: systemMessage
      });

      console.log(`New pairing: ${socket.id} and ${partner.id} in room ${roomId}`);
    } else {
      socket.emit('waiting', { message: 'Finding someone new...' });
    }
  });

  // Handle user stopping/disconnecting from current chat
  socket.on('stopChat', (data) => {
    const { roomId } = data;

    if (roomId && activeRooms.has(roomId)) {
      socket.leave(roomId);

      const room = activeRooms.get(roomId);
      const partner = (room.user1.id === socket.id) ? room.user2 : room.user1;

      partner.emit('partnerDisconnected', { reason: 'partner_stopped' });
      partner.leave(roomId);
      activeRooms.delete(roomId);
    }

    // Put user back in waiting list if they want to continue
    if (data.continueWaiting && socket.chatMode) {
      waitingUsers[socket.chatMode].push(socket);
      socket.emit('waiting', { message: 'Ready to find another stranger...' });
    } else {
      socket.emit('chatEnded');
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    cleanupRoom(socket);
  });

  // Handle reconnection
  socket.on('reconnectAttempt', () => {
    // Clean up any old connections
    cleanupRoom(socket);
  });

  // Get online user count (for display)
  socket.on('getOnlineCount', () => {
    const totalUsers = io.sockets.sockets.size;
    socket.emit('onlineCount', { count: totalUsers });
  });

  // WebRTC signaling for P2P audio/video connections
  socket.on('webrtc-signal', (data) => {
    const { roomId, signal } = data;

    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);

      // Send signal to the other user in the room
      if (room.user1.id === socket.id) {
        room.user2.emit('webrtc-signal', { signal });
      } else if (room.user2.id === socket.id) {
        room.user1.emit('webrtc-signal', { signal });
      }
    }
  });

  socket.on('webrtc-ready', (data) => {
    const { roomId } = data;

    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);

      // Notify the other user that this peer is ready
      if (room.user1.id === socket.id) {
        room.user2.emit('webrtc-ready');
      } else if (room.user2.id === socket.id) {
        room.user1.emit('webrtc-ready');
      }
    }
  });

  // Keep track of online count updates
  socket.on('updateOnlineCount', () => {
    // Emit periodic online count updates (simplified)
    const count = io.sockets.sockets.size;
    setInterval(() => {
      socket.emit('onlineCountUpdate', { count: io.sockets.sockets.size });
    }, 5000);
  });
});

// Serve static files in production (dist is one level up from server directory)
app.use(express.static(join(__dirname, '..', 'dist')));

// Serve React app on all GET requests (spa fallback)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Stranger Chat server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
