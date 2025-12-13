const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const LiveClass = require('../models/LiveClass');

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} - Socket.io server instance
 */
function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow all origins in development
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          process.env.CORS_ORIGIN
        ].filter(Boolean);
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user based on role
      let user;
      if (decoded.role === 'teacher') {
        user = await Teacher.findById(decoded.id).select('name email phone profileImage');
      } else if (decoded.role === 'student') {
        user = await Student.findById(decoded.id).select('name email phone profileImage classId boardId');
      } else if (decoded.role === 'admin') {
        // For admin, create a minimal user object
        user = { name: 'Admin', email: decoded.email || '', phone: '', profileImage: '' };
      } else {
        throw new Error('Invalid user role');
      }

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Store active connections
  const activeConnections = new Map(); // userId -> Set of socketIds
  const socketToUser = new Map(); // socketId -> { userId, liveClassId, role }

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} - User: ${socket.userId} (${socket.userRole})`);

    // Track connection
    if (!activeConnections.has(socket.userId)) {
      activeConnections.set(socket.userId, new Set());
    }
    activeConnections.get(socket.userId).add(socket.id);

    // Handle join live class room
    socket.on('join-live-class', async ({ liveClassId }) => {
      try {
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass) {
          socket.emit('error', { message: 'Live class not found' });
          return;
        }

        if (liveClass.status !== 'live') {
          socket.emit('error', { message: 'Class is not live' });
          return;
        }

        // Join room
        socket.join(`live-class-${liveClassId}`);
        socketToUser.set(socket.id, {
          userId: socket.userId,
          liveClassId,
          role: socket.userRole
        });
        
        // Verify room join
        const room = io.sockets.adapter.rooms.get(`live-class-${liveClassId}`);
        const roomSize = room ? room.size : 0;
        console.log(`User ${socket.userId} (${socket.userRole}) joined room live-class-${liveClassId}, room size: ${roomSize}`);
        
        // Send confirmation to user
        socket.emit('room-joined', {
          liveClassId,
          roomSize,
          message: 'Successfully joined live class room'
        });

        // Remove duplicates and update participant in database
        const userIdStr = socket.userId.toString();
        
        // Remove any duplicate entries for this user
        liveClass.participants = liveClass.participants.filter(
          (p, index, self) => {
            const pUserIdStr = p.userId?.toString() || p.userId;
            // Keep only the first occurrence of this userId
            return self.findIndex(pp => (pp.userId?.toString() || pp.userId) === pUserIdStr) === index;
          }
        );
        
        // Find existing participant
        const participant = liveClass.participants.find(
          p => {
            const pUserIdStr = p.userId?.toString() || p.userId;
            return pUserIdStr === userIdStr;
          }
        );

        if (participant) {
          participant.joinedAt = new Date();
          participant.leftAt = undefined;
          await liveClass.save();
        }

        // Notify others in the room
        socket.to(`live-class-${liveClassId}`).emit('user-joined', {
          userId: socket.userId,
          userName: socket.user.name,
          userRole: socket.userRole,
          timestamp: new Date()
        });

        // Get updated participants list
        const currentParticipants = await LiveClass.findById(liveClassId)
          .populate('participants.userId', 'name email profileImage');
        
        // Broadcast updated participants list to ALL users in room (including the new user)
        io.to(`live-class-${liveClassId}`).emit('participants-updated', {
          participants: currentParticipants.participants
        });

        console.log(`User ${socket.userId} joined live class ${liveClassId}`);
      } catch (error) {
        console.error('Error joining live class:', error);
        socket.emit('error', { message: 'Failed to join live class' });
      }
    });

    // Handle leave live class
    socket.on('leave-live-class', async ({ liveClassId }) => {
      try {
        socket.leave(`live-class-${liveClassId}`);
        
        const userInfo = socketToUser.get(socket.id);
        if (userInfo) {
          // Update participant in database
          const liveClass = await LiveClass.findById(liveClassId);
          if (liveClass) {
            const participant = liveClass.participants.find(
              p => p.userId.toString() === userInfo.userId.toString()
            );
            if (participant) {
              participant.leftAt = new Date();
              await liveClass.save();
            }
          }

          // Notify others
          socket.to(`live-class-${liveClassId}`).emit('user-left', {
            userId: userInfo.userId,
            userName: socket.user.name,
            userRole: userInfo.role,
            timestamp: new Date()
          });

          // Broadcast updated participants list to all in room
          const updatedLiveClass = await LiveClass.findById(liveClassId)
            .populate('participants.userId', 'name email profileImage');
          
          io.to(`live-class-${liveClassId}`).emit('participants-updated', {
            participants: updatedLiveClass.participants
          });
        }

        socketToUser.delete(socket.id);
        console.log(`User ${socket.userId} left live class ${liveClassId}`);
      } catch (error) {
        console.error('Error leaving live class:', error);
      }
    });

    // Handle chat message
    socket.on('chat-message', async ({ liveClassId, message }) => {
      try {
        if (!message || !message.trim()) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass || liveClass.status !== 'live') {
          socket.emit('error', { message: 'Class is not live' });
          return;
        }

        // Add message to database
        const chatMessage = {
          userId: socket.userId,
          userType: socket.userRole === 'student' ? 'Student' : 'Teacher',
          userName: socket.user.name,
          message: message.trim(),
          timestamp: new Date()
        };

        liveClass.chatMessages.push(chatMessage);
        await liveClass.save();

        // Broadcast to all in room
        const messageToSend = {
          ...chatMessage,
          _id: liveClass.chatMessages[liveClass.chatMessages.length - 1]._id
        };
        
        // Get all sockets in the room to verify
        const room = io.sockets.adapter.rooms.get(`live-class-${liveClassId}`);
        const roomSize = room ? room.size : 0;
        console.log(`Broadcasting chat message to room live-class-${liveClassId}, room size: ${roomSize}`);
        console.log(`Message details:`, {
          userId: socket.userId,
          userName: socket.user.name,
          userRole: socket.userRole,
          message: messageToSend.message,
          messageId: messageToSend._id
        });
        
        // Broadcast to all in room (including sender for confirmation)
        io.to(`live-class-${liveClassId}`).emit('chat-message', messageToSend);
        
        console.log(`Chat message from ${socket.userId} (${socket.userRole}) in class ${liveClassId} broadcasted to ${roomSize} users`);
      } catch (error) {
        console.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle hand raise
    socket.on('hand-raise', async ({ liveClassId, raised }) => {
      try {
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass || liveClass.status !== 'live') {
          socket.emit('error', { message: 'Class is not live' });
          return;
        }

        const participant = liveClass.participants.find(
          p => p.userId.toString() === socket.userId.toString()
        );

        if (!participant) {
          socket.emit('error', { message: 'You are not a participant' });
          return;
        }

        participant.hasRaisedHand = raised !== false;
        await liveClass.save();

        // Notify all in room (including teacher) - use io.to() to broadcast to everyone
        const handRaiseData = {
          userId: socket.userId,
          userName: socket.user.name,
          hasRaisedHand: participant.hasRaisedHand,
          timestamp: new Date()
        };
        
        // Get all sockets in the room to verify
        const room = io.sockets.adapter.rooms.get(`live-class-${liveClassId}`);
        const roomSize = room ? room.size : 0;
        console.log(`Broadcasting hand-raise-updated to room live-class-${liveClassId}, room size: ${roomSize}`);
        
        // Broadcast hand raise update to all in room
        io.to(`live-class-${liveClassId}`).emit('hand-raise-updated', handRaiseData);
        
        // Also broadcast updated participants list so teacher sees the change instantly
        const updatedLiveClass = await LiveClass.findById(liveClassId)
          .populate('participants.userId', 'name email profileImage');
        io.to(`live-class-${liveClassId}`).emit('participants-updated', {
          participants: updatedLiveClass.participants
        });

        // Confirm to sender
        socket.emit('hand-raise-confirmed', {
          hasRaisedHand: participant.hasRaisedHand
        });

        console.log(`Hand raise ${participant.hasRaisedHand ? 'raised' : 'lowered'} by ${socket.userId} (${socket.userRole}), broadcasted to ${roomSize} users`);
      } catch (error) {
        console.error('Error handling hand raise:', error);
        socket.emit('error', { message: 'Failed to update hand raise' });
      }
    });

    // Handle participant mute/unmute (teacher can control students)
    socket.on('participant-mute', async ({ liveClassId, targetUserId, muted }) => {
      try {
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass || liveClass.status !== 'live') {
          socket.emit('error', { message: 'Class is not live' });
          return;
        }

        // Only teacher can mute others
        if (socket.userRole !== 'teacher') {
          socket.emit('error', { message: 'Only teacher can mute participants' });
          return;
        }

        const participant = liveClass.participants.find(
          p => p.userId.toString() === targetUserId.toString()
        );

        if (!participant) {
          socket.emit('error', { message: 'Participant not found' });
          return;
        }

        participant.isMuted = muted !== false;
        await liveClass.save();

        // Notify target user
        io.to(`live-class-${liveClassId}`).emit('participant-muted', {
          userId: targetUserId,
          isMuted: participant.isMuted,
          timestamp: new Date()
        });

        console.log(`Participant ${targetUserId} ${participant.isMuted ? 'muted' : 'unmuted'} by teacher`);
      } catch (error) {
        console.error('Error muting participant:', error);
        socket.emit('error', { message: 'Failed to mute participant' });
      }
    });

    // Handle kick student (teacher only)
    socket.on('kick-student', async ({ liveClassId, targetUserId }) => {
      try {
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass || liveClass.status !== 'live') {
          socket.emit('error', { message: 'Class is not live' });
          return;
        }

        // Only teacher can kick
        if (socket.userRole !== 'teacher') {
          socket.emit('error', { message: 'Only teacher can kick students' });
          return;
        }

        const participant = liveClass.participants.find(
          p => p.userId.toString() === targetUserId.toString()
        );

        if (!participant || participant.userType !== 'Student') {
          socket.emit('error', { message: 'Student not found' });
          return;
        }

        participant.leftAt = new Date();
        await liveClass.save();

        // Notify kicked student
        io.to(`live-class-${liveClassId}`).emit('student-kicked', {
          userId: targetUserId,
          timestamp: new Date()
        });

        // Notify others
        socket.to(`live-class-${liveClassId}`).emit('user-left', {
          userId: targetUserId,
          userName: participant.userId?.name || 'Student',
          userRole: 'student',
          timestamp: new Date()
        });

        // Broadcast updated participants list to all in room
        const updatedLiveClass = await LiveClass.findById(liveClassId)
          .populate('participants.userId', 'name email profileImage');
        
        io.to(`live-class-${liveClassId}`).emit('participants-updated', {
          participants: updatedLiveClass.participants
        });

        console.log(`Student ${targetUserId} kicked by teacher ${socket.userId}`);
      } catch (error) {
        console.error('Error kicking student:', error);
        socket.emit('error', { message: 'Failed to kick student' });
      }
    });

    // Handle screen share status
    socket.on('screen-share-status', ({ liveClassId, isSharing }) => {
      socket.to(`live-class-${liveClassId}`).emit('screen-share-status', {
        userId: socket.userId,
        isSharing,
        timestamp: new Date()
      });
    });

    // Handle participant status update
    socket.on('participant-status', async ({ liveClassId, isMuted, isVideoEnabled }) => {
      try {
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass || liveClass.status !== 'live') {
          return;
        }

        const participant = liveClass.participants.find(
          p => p.userId.toString() === socket.userId.toString()
        );

        if (participant) {
          if (isMuted !== undefined) participant.isMuted = isMuted;
          if (isVideoEnabled !== undefined) participant.isVideoEnabled = isVideoEnabled;
          await liveClass.save();
        }

        // Broadcast to others (including the sender for consistency)
        io.to(`live-class-${liveClassId}`).emit('participant-status-updated', {
          userId: socket.userId,
          isMuted: participant?.isMuted,
          isVideoEnabled: participant?.isVideoEnabled,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating participant status:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id} - User: ${socket.userId}`);

      const userInfo = socketToUser.get(socket.id);
      if (userInfo) {
        try {
          const liveClass = await LiveClass.findById(userInfo.liveClassId);
          if (liveClass) {
            const participant = liveClass.participants.find(
              p => p.userId.toString() === userInfo.userId.toString()
            );
            if (participant) {
              participant.leftAt = new Date();
              await liveClass.save();
            }

            // Notify others
            socket.to(`live-class-${userInfo.liveClassId}`).emit('user-left', {
              userId: userInfo.userId,
              userName: socket.user?.name || 'User',
              userRole: userInfo.role,
              timestamp: new Date()
            });

            // Broadcast updated participants list to all in room
            const updatedLiveClass = await LiveClass.findById(userInfo.liveClassId)
              .populate('participants.userId', 'name email profileImage');
            
            io.to(`live-class-${userInfo.liveClassId}`).emit('participants-updated', {
              participants: updatedLiveClass.participants
            });
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }

        socketToUser.delete(socket.id);
      }

      // Remove from active connections
      if (activeConnections.has(socket.userId)) {
        activeConnections.get(socket.userId).delete(socket.id);
        if (activeConnections.get(socket.userId).size === 0) {
          activeConnections.delete(socket.userId);
        }
      }
    });
  });

  return io;
}

module.exports = { initializeSocket };

