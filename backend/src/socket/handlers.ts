import { Server, Socket } from 'socket.io';
import { getFirestore } from '../config/firebase';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface SocketUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
}

interface SocketData {
  user?: SocketUser;
  lectureId?: string;
}

export const setupSocketHandlers = (io: Server): void => {
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token (you can use the same logic as in auth middleware)
      // For now, we'll assume the token is valid and extract user info
      const user: SocketUser = {
        uid: 'user-id', // Extract from token
        email: 'user@example.com', // Extract from token
        displayName: 'User', // Extract from token
        role: 'user', // Extract from token
      };

      socket.data.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info(`User connected: ${user?.email} (${socket.id})`);

    // Join user to their personal room
    socket.join(`user:${user?.uid}`);

    // Handle joining a lecture
    socket.on('join-lecture', async (lectureId: string) => {
      try {
        const db = getFirestore();
        
        // Verify lecture exists
        const lectureDoc = await db.collection('lectures').doc(lectureId).get();
        if (!lectureDoc.exists) {
          socket.emit('error', { message: 'Lecture not found' });
          return;
        }

        // Join lecture room
        socket.join(`lecture:${lectureId}`);
        socket.data.lectureId = lectureId;

        // Add user to lecture participants
        const lectureData = lectureDoc.data();
        const participants = lectureData?.participants || [];
        
        if (!participants.includes(user?.uid)) {
          participants.push(user?.uid);
          await db.collection('lectures').doc(lectureId).update({
            participants,
            updatedAt: new Date().toISOString(),
          });
        }

        // Notify others in the lecture
        socket.to(`lecture:${lectureId}`).emit('user-joined', {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
          timestamp: new Date().toISOString(),
        });

        // Send current lecture state
        socket.emit('lecture-state', {
          lecture: { id: lectureDoc.id, ...lectureData },
          participants: participants,
        });

        logger.info(`User ${user?.email} joined lecture ${lectureId}`);
      } catch (error) {
        logger.error('Error joining lecture:', error);
        socket.emit('error', { message: 'Failed to join lecture' });
      }
    });

    // Handle leaving a lecture
    socket.on('leave-lecture', async (lectureId: string) => {
      try {
        const db = getFirestore();
        
        // Remove user from lecture participants
        const lectureRef = db.collection('lectures').doc(lectureId);
        await db.runTransaction(async (transaction) => {
          const lectureDoc = await transaction.get(lectureRef);
          
          if (lectureDoc.exists) {
            const lectureData = lectureDoc.data();
            const participants = lectureData?.participants || [];
            const updatedParticipants = participants.filter((id: string) => id !== user?.uid);
            
            transaction.update(lectureRef, {
              participants: updatedParticipants,
              updatedAt: new Date().toISOString(),
            });
          }
        });

        // Leave lecture room
        socket.leave(`lecture:${lectureId}`);
        socket.data.lectureId = undefined;

        // Notify others in the lecture
        socket.to(`lecture:${lectureId}`).emit('user-left', {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
          timestamp: new Date().toISOString(),
        });

        logger.info(`User ${user?.email} left lecture ${lectureId}`);
      } catch (error) {
        logger.error('Error leaving lecture:', error);
        socket.emit('error', { message: 'Failed to leave lecture' });
      }
    });

    // Handle chat messages
    socket.on('send-message', async (data: { lectureId: string; message: string }) => {
      try {
        const { lectureId, message } = data;
        
        if (!socket.rooms.has(`lecture:${lectureId}`)) {
          socket.emit('error', { message: 'Not in lecture room' });
          return;
        }

        const db = getFirestore();
        const messageData = {
          id: uuidv4(),
          lectureId,
          userId: user?.uid,
          message,
          timestamp: new Date().toISOString(),
          isAI: false,
        };

        // Save message to database
        await db.collection('chatMessages').doc(messageData.id).set(messageData);

        // Broadcast message to lecture room
        io.to(`lecture:${lectureId}`).emit('new-message', {
          ...messageData,
          user: {
            uid: user?.uid,
            email: user?.email,
            displayName: user?.displayName,
          },
        });

        logger.info(`Message sent in lecture ${lectureId} by ${user?.email}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle subtitle updates
    socket.on('update-subtitle', async (data: { subtitleId: string; text: string; startTime?: number; endTime?: number }) => {
      try {
        const { subtitleId, text, startTime, endTime } = data;
        
        const db = getFirestore();
        const subtitleDoc = await db.collection('subtitles').doc(subtitleId).get();
        
        if (!subtitleDoc.exists) {
          socket.emit('error', { message: 'Subtitle not found' });
          return;
        }

        const subtitleData = subtitleDoc.data();
        const lectureId = subtitleData?.lectureId;

        if (!lectureId || !socket.rooms.has(`lecture:${lectureId}`)) {
          socket.emit('error', { message: 'Not authorized to update subtitle' });
          return;
        }

        // Update subtitle
        const updateData: any = { text };
        if (startTime !== undefined) updateData.startTime = startTime;
        if (endTime !== undefined) updateData.endTime = endTime;

        await db.collection('subtitles').doc(subtitleId).update(updateData);

        // Broadcast update to lecture room
        io.to(`lecture:${lectureId}`).emit('subtitle-updated', {
          id: subtitleId,
          text,
          startTime,
          endTime,
          updatedBy: user?.uid,
          timestamp: new Date().toISOString(),
        });

        logger.info(`Subtitle updated in lecture ${lectureId} by ${user?.email}`);
      } catch (error) {
        logger.error('Error updating subtitle:', error);
        socket.emit('error', { message: 'Failed to update subtitle' });
      }
    });

    // Handle new subtitle creation
    socket.on('create-subtitle', async (data: { lectureId: string; startTime: number; endTime: number; text: string; language?: string }) => {
      try {
        const { lectureId, startTime, endTime, text, language = 'en' } = data;
        
        if (!socket.rooms.has(`lecture:${lectureId}`)) {
          socket.emit('error', { message: 'Not in lecture room' });
          return;
        }

        const db = getFirestore();
        const subtitleData = {
          id: uuidv4(),
          lectureId,
          startTime,
          endTime,
          text,
          language,
          confidence: 1.0,
          isAI: false,
          createdAt: new Date().toISOString(),
        };

        // Save subtitle to database
        await db.collection('subtitles').doc(subtitleData.id).set(subtitleData);

        // Broadcast new subtitle to lecture room
        io.to(`lecture:${lectureId}`).emit('subtitle-added', {
          ...subtitleData,
          createdBy: user?.uid,
        });

        logger.info(`Subtitle created in lecture ${lectureId} by ${user?.email}`);
      } catch (error) {
        logger.error('Error creating subtitle:', error);
        socket.emit('error', { message: 'Failed to create subtitle' });
      }
    });

    // Handle lecture status updates
    socket.on('update-lecture-status', async (data: { lectureId: string; status: string }) => {
      try {
        const { lectureId, status } = data;
        
        if (!socket.rooms.has(`lecture:${lectureId}`)) {
          socket.emit('error', { message: 'Not in lecture room' });
          return;
        }

        const db = getFirestore();
        const lectureDoc = await db.collection('lectures').doc(lectureId).get();
        
        if (!lectureDoc.exists) {
          socket.emit('error', { message: 'Lecture not found' });
          return;
        }

        const lectureData = lectureDoc.data();
        if (lectureData?.instructorId !== user?.uid && user?.role !== 'admin') {
          socket.emit('error', { message: 'Not authorized to update lecture status' });
          return;
        }

        // Update lecture status
        await db.collection('lectures').doc(lectureId).update({
          status,
          updatedAt: new Date().toISOString(),
        });

        // Broadcast status update to lecture room
        io.to(`lecture:${lectureId}`).emit('lecture-status-updated', {
          lectureId,
          status,
          updatedBy: user?.uid,
          timestamp: new Date().toISOString(),
        });

        logger.info(`Lecture status updated to ${status} in lecture ${lectureId} by ${user?.email}`);
      } catch (error) {
        logger.error('Error updating lecture status:', error);
        socket.emit('error', { message: 'Failed to update lecture status' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (lectureId: string) => {
      socket.to(`lecture:${lectureId}`).emit('user-typing', {
        uid: user?.uid,
        displayName: user?.displayName,
        isTyping: true,
      });
    });

    socket.on('typing-stop', (lectureId: string) => {
      socket.to(`lecture:${lectureId}`).emit('user-typing', {
        uid: user?.uid,
        displayName: user?.displayName,
        isTyping: false,
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const lectureId = socket.data.lectureId;
      
      if (lectureId) {
        try {
          const db = getFirestore();
          
          // Remove user from lecture participants
          const lectureRef = db.collection('lectures').doc(lectureId);
          await db.runTransaction(async (transaction) => {
            const lectureDoc = await transaction.get(lectureRef);
            
            if (lectureDoc.exists) {
              const lectureData = lectureDoc.data();
              const participants = lectureData?.participants || [];
              const updatedParticipants = participants.filter((id: string) => id !== user?.uid);
              
              transaction.update(lectureRef, {
                participants: updatedParticipants,
                updatedAt: new Date().toISOString(),
              });
            }
          });

          // Notify others in the lecture
          socket.to(`lecture:${lectureId}`).emit('user-left', {
            uid: user?.uid,
            email: user?.email,
            displayName: user?.displayName,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error('Error handling disconnect:', error);
        }
      }

      logger.info(`User disconnected: ${user?.email} (${socket.id})`);
    });
  });

  logger.info('Socket.io handlers setup complete');
};
