import { IResolvers } from 'apollo-server-express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getFirestore } from '../config/firebase';
import { generateText, analyzeContent, generateSubtitles } from '../config/googleAI';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface Context {
  req: AuthenticatedRequest;
  user?: {
    uid: string;
    email: string;
    displayName?: string;
    role?: string;
  };
}

const resolvers: IResolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(context.user.uid).get();
      
      if (!userDoc.exists) {
        // Create user if doesn't exist
        const userData = {
          uid: context.user.uid,
          email: context.user.email,
          displayName: context.user.displayName,
          role: context.user.role || 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await db.collection('users').doc(context.user.uid).set(userData);
        return { id: context.user.uid, ...userData };
      }
      
      return { id: userDoc.id, ...userDoc.data() };
    },

    user: async (_: any, { id }: { id: string }) => {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      return { id: userDoc.id, ...userDoc.data() };
    },

    users: async () => {
      const db = getFirestore();
      const usersSnapshot = await db.collection('users').get();
      
      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    lectures: async () => {
      const db = getFirestore();
      const lecturesSnapshot = await db.collection('lectures').get();
      
      return lecturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    lecture: async (_: any, { id }: { id: string }) => {
      const db = getFirestore();
      const lectureDoc = await db.collection('lectures').doc(id).get();
      
      if (!lectureDoc.exists) {
        throw new Error('Lecture not found');
      }
      
      return { id: lectureDoc.id, ...lectureDoc.data() };
    },

    myLectures: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const lecturesSnapshot = await db
        .collection('lectures')
        .where('instructorId', '==', context.user.uid)
        .get();
      
      return lecturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    scheduledLectures: async () => {
      const db = getFirestore();
      const lecturesSnapshot = await db
        .collection('lectures')
        .where('status', '==', 'SCHEDULED')
        .get();
      
      return lecturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    liveLectures: async () => {
      const db = getFirestore();
      const lecturesSnapshot = await db
        .collection('lectures')
        .where('status', '==', 'LIVE')
        .get();
      
      return lecturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    subtitles: async (_: any, { lectureId }: { lectureId: string }) => {
      const db = getFirestore();
      const subtitlesSnapshot = await db
        .collection('subtitles')
        .where('lectureId', '==', lectureId)
        .orderBy('startTime')
        .get();
      
      return subtitlesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    subtitle: async (_: any, { id }: { id: string }) => {
      const db = getFirestore();
      const subtitleDoc = await db.collection('subtitles').doc(id).get();
      
      if (!subtitleDoc.exists) {
        throw new Error('Subtitle not found');
      }
      
      return { id: subtitleDoc.id, ...subtitleDoc.data() };
    },

    aiAnalyses: async (_: any, { lectureId }: { lectureId: string }) => {
      const db = getFirestore();
      const analysesSnapshot = await db
        .collection('aiAnalyses')
        .where('lectureId', '==', lectureId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return analysesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    aiAnalysis: async (_: any, { id }: { id: string }) => {
      const db = getFirestore();
      const analysisDoc = await db.collection('aiAnalyses').doc(id).get();
      
      if (!analysisDoc.exists) {
        throw new Error('AI Analysis not found');
      }
      
      return { id: analysisDoc.id, ...analysisDoc.data() };
    },

    chatMessages: async (_: any, { lectureId }: { lectureId: string }) => {
      const db = getFirestore();
      const messagesSnapshot = await db
        .collection('chatMessages')
        .where('lectureId', '==', lectureId)
        .orderBy('timestamp')
        .limit(100)
        .get();
      
      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    files: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const filesSnapshot = await db
        .collection('files')
        .where('uploadedBy', '==', context.user.uid)
        .orderBy('uploadedAt', 'desc')
        .get();
      
      return filesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    file: async (_: any, { id }: { id: string }) => {
      const db = getFirestore();
      const fileDoc = await db.collection('files').doc(id).get();
      
      if (!fileDoc.exists) {
        throw new Error('File not found');
      }
      
      return { id: fileDoc.id, ...fileDoc.data() };
    },
  },

  Mutation: {
    updateProfile: async (_: any, { displayName, role }: { displayName?: string; role?: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const updateData: any = { updatedAt: new Date().toISOString() };
      
      if (displayName !== undefined) updateData.displayName = displayName;
      if (role !== undefined) updateData.role = role;
      
      await db.collection('users').doc(context.user.uid).update(updateData);
      
      const userDoc = await db.collection('users').doc(context.user.uid).get();
      return { id: userDoc.id, ...userDoc.data() };
    },

    createLecture: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const lectureData = {
        ...input,
        instructorId: context.user.uid,
        status: 'SCHEDULED',
        participants: [context.user.uid],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const lectureRef = await db.collection('lectures').add(lectureData);
      const lectureDoc = await lectureRef.get();
      
      return { id: lectureDoc.id, ...lectureDoc.data() };
    },

    updateLecture: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const lectureDoc = await db.collection('lectures').doc(id).get();
      
      if (!lectureDoc.exists) {
        throw new Error('Lecture not found');
      }
      
      const lectureData = lectureDoc.data();
      if (lectureData?.instructorId !== context.user.uid && context.user.role !== 'admin') {
        throw new Error('Unauthorized to update this lecture');
      }
      
      const updateData = {
        ...input,
        updatedAt: new Date().toISOString(),
      };
      
      await db.collection('lectures').doc(id).update(updateData);
      
      const updatedDoc = await db.collection('lectures').doc(id).get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    },

    deleteLecture: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const lectureDoc = await db.collection('lectures').doc(id).get();
      
      if (!lectureDoc.exists) {
        throw new Error('Lecture not found');
      }
      
      const lectureData = lectureDoc.data();
      if (lectureData?.instructorId !== context.user.uid && context.user.role !== 'admin') {
        throw new Error('Unauthorized to delete this lecture');
      }
      
      await db.collection('lectures').doc(id).delete();
      return true;
    },

    joinLecture: async (_: any, { lectureId }: { lectureId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const lectureRef = db.collection('lectures').doc(lectureId);
      
      await db.runTransaction(async (transaction) => {
        const lectureDoc = await transaction.get(lectureRef);
        
        if (!lectureDoc.exists) {
          throw new Error('Lecture not found');
        }
        
        const lectureData = lectureDoc.data();
        const participants = lectureData?.participants || [];
        
        if (!participants.includes(context.user!.uid)) {
          participants.push(context.user!.uid);
          transaction.update(lectureRef, { 
            participants,
            updatedAt: new Date().toISOString()
          });
        }
      });
      
      const updatedDoc = await lectureRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    },

    leaveLecture: async (_: any, { lectureId }: { lectureId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const lectureRef = db.collection('lectures').doc(lectureId);
      
      await db.runTransaction(async (transaction) => {
        const lectureDoc = await transaction.get(lectureRef);
        
        if (!lectureDoc.exists) {
          throw new Error('Lecture not found');
        }
        
        const lectureData = lectureDoc.data();
        const participants = lectureData?.participants || [];
        const updatedParticipants = participants.filter((id: string) => id !== context.user!.uid);
        
        transaction.update(lectureRef, { 
          participants: updatedParticipants,
          updatedAt: new Date().toISOString()
        });
      });
      
      return true;
    },

    createSubtitle: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const subtitleData = {
        ...input,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      
      await db.collection('subtitles').doc(subtitleData.id).set(subtitleData);
      
      return subtitleData;
    },

    updateSubtitle: async (_: any, { id, text, startTime, endTime }: { id: string; text: string; startTime?: number; endTime?: number }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const subtitleDoc = await db.collection('subtitles').doc(id).get();
      
      if (!subtitleDoc.exists) {
        throw new Error('Subtitle not found');
      }
      
      const updateData: any = { text };
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      
      await db.collection('subtitles').doc(id).update(updateData);
      
      const updatedDoc = await db.collection('subtitles').doc(id).get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    },

    deleteSubtitle: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const subtitleDoc = await db.collection('subtitles').doc(id).get();
      
      if (!subtitleDoc.exists) {
        throw new Error('Subtitle not found');
      }
      
      await db.collection('subtitles').doc(id).delete();
      return true;
    },

    generateSubtitles: async (_: any, { lectureId, language = 'en' }: { lectureId: string; language?: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      // This would typically involve audio processing and AI transcription
      // For now, we'll return a placeholder
      const db = getFirestore();
      
      // Get lecture content (this would be audio transcript in real implementation)
      const lectureDoc = await db.collection('lectures').doc(lectureId).get();
      if (!lectureDoc.exists) {
        throw new Error('Lecture not found');
      }
      
      // Generate subtitles using Google AI
      const transcript = "Sample transcript for subtitle generation"; // This would be the actual audio transcript
      const webvttContent = await generateSubtitles(transcript, language);
      
      // Parse WebVTT and create subtitle entries
      const subtitles = parseWebVTT(webvttContent, lectureId);
      
      // Save subtitles to database
      const batch = db.batch();
      subtitles.forEach(subtitle => {
        const subtitleRef = db.collection('subtitles').doc(subtitle.id);
        batch.set(subtitleRef, subtitle);
      });
      await batch.commit();
      
      return subtitles;
    },

    createAIAnalysis: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const analysisData = {
        ...input,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      
      await db.collection('aiAnalyses').doc(analysisData.id).set(analysisData);
      
      return analysisData;
    },

    analyzeContent: async (_: any, { content, type }: { content: string; type: string }) => {
      try {
        const result = await analyzeContent(content, type as any);
        return result;
      } catch (error) {
        logger.error('AI analysis error:', error);
        throw new Error('Failed to analyze content');
      }
    },

    generateSummary: async (_: any, { lectureId }: { lectureId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const subtitlesSnapshot = await db
        .collection('subtitles')
        .where('lectureId', '==', lectureId)
        .orderBy('startTime')
        .get();
      
      const subtitles = subtitlesSnapshot.docs.map(doc => doc.data());
      const fullText = subtitles.map(s => s.text).join(' ');
      
      try {
        const summary = await generateText(`Please provide a concise summary of the following lecture content:\n\n${fullText}`, {
          temperature: 0.3,
          maxOutputTokens: 500,
        });
        
        return summary;
      } catch (error) {
        logger.error('Summary generation error:', error);
        throw new Error('Failed to generate summary');
      }
    },

    sendMessage: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const messageData = {
        ...input,
        userId: context.user.uid,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        isAI: false,
      };
      
      await db.collection('chatMessages').doc(messageData.id).set(messageData);
      
      return messageData;
    },

    sendAIMessage: async (_: any, { lectureId, message }: { lectureId: string; message: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      try {
        const aiResponse = await generateText(`You are an AI assistant helping with a lecture. A user asked: "${message}". Please provide a helpful response.`, {
          temperature: 0.7,
          maxOutputTokens: 300,
        });
        
        const db = getFirestore();
        const messageData = {
          lectureId,
          userId: 'ai-assistant',
          message: aiResponse,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          isAI: true,
        };
        
        await db.collection('chatMessages').doc(messageData.id).set(messageData);
        
        return messageData;
      } catch (error) {
        logger.error('AI message generation error:', error);
        throw new Error('Failed to generate AI response');
      }
    },

    uploadFile: async (_: any, { file }: { file: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      // File upload logic would go here
      // For now, return a placeholder
      const fileData = {
        id: uuidv4(),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `https://storage.googleapis.com/your-bucket/${file.filename}`,
        uploadedBy: context.user.uid,
        uploadedAt: new Date().toISOString(),
      };
      
      const db = getFirestore();
      await db.collection('files').doc(fileData.id).set(fileData);
      
      return fileData;
    },

    deleteFile: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const db = getFirestore();
      const fileDoc = await db.collection('files').doc(id).get();
      
      if (!fileDoc.exists) {
        throw new Error('File not found');
      }
      
      const fileData = fileDoc.data();
      if (fileData?.uploadedBy !== context.user.uid && context.user.role !== 'admin') {
        throw new Error('Unauthorized to delete this file');
      }
      
      await db.collection('files').doc(id).delete();
      return true;
    },
  },

  Lecture: {
    instructor: async (parent: any) => {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(parent.instructorId).get();
      
      if (!userDoc.exists) {
        throw new Error('Instructor not found');
      }
      
      return { id: userDoc.id, ...userDoc.data() };
    },

    subtitles: async (parent: any) => {
      const db = getFirestore();
      const subtitlesSnapshot = await db
        .collection('subtitles')
        .where('lectureId', '==', parent.id)
        .orderBy('startTime')
        .get();
      
      return subtitlesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    participants: async (parent: any) => {
      const db = getFirestore();
      const participants = parent.participants || [];
      
      const userDocs = await Promise.all(
        participants.map((uid: string) => db.collection('users').doc(uid).get())
      );
      
      return userDocs
        .filter(doc => doc.exists)
        .map(doc => ({ id: doc.id, ...doc.data() }));
    },
  },

  ChatMessage: {
    user: async (parent: any) => {
      if (parent.isAI) {
        return {
          id: 'ai-assistant',
          uid: 'ai-assistant',
          email: 'ai@assistant.com',
          displayName: 'AI Assistant',
          role: 'ai',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(parent.userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      return { id: userDoc.id, ...userDoc.data() };
    },
  },
};

// Helper function to parse WebVTT content
function parseWebVTT(webvttContent: string, lectureId: string) {
  const lines = webvttContent.split('\n');
  const subtitles: any[] = [];
  let currentSubtitle: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') continue;
    if (line === 'WEBVTT') continue;
    
    // Check if line contains timestamp
    const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (timestampMatch) {
      if (currentSubtitle) {
        subtitles.push(currentSubtitle);
      }
      
      const startTime = parseTimestamp(timestampMatch[1]);
      const endTime = parseTimestamp(timestampMatch[2]);
      
      currentSubtitle = {
        id: uuidv4(),
        lectureId,
        startTime,
        endTime,
        text: '',
        language: 'en',
        confidence: 0.9,
        isAI: true,
        createdAt: new Date().toISOString(),
      };
    } else if (currentSubtitle && line) {
      currentSubtitle.text += (currentSubtitle.text ? ' ' : '') + line;
    }
  }
  
  if (currentSubtitle) {
    subtitles.push(currentSubtitle);
  }
  
  return subtitles;
}

// Helper function to parse timestamp
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2]);
  
  return hours * 3600 + minutes * 60 + seconds;
}

export { resolvers };
