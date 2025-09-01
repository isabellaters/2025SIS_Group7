import { Router } from 'express';
import { getAuth } from '../config/firebase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Get current user
router.get('/me', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userRecord = await getAuth().getUser(req.user.uid);
    
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    });
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
}));

// Update user profile
router.put('/profile', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { displayName, photoURL } = req.body;

  try {
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    await getAuth().updateUser(req.user.uid, updateData);
    
    const userRecord = await getAuth().getUser(req.user.uid);
    
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
}));

// Verify Firebase token
router.post('/verify-token', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      iat: decodedToken.iat,
      exp: decodedToken.exp,
    });
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}));

// Get user by UID
router.get('/user/:uid', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { uid } = req.params;

  try {
    const userRecord = await getAuth().getUser(uid);
    
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    });
  } catch (error) {
    logger.error('Error getting user by UID:', error);
    res.status(404).json({ error: 'User not found' });
  }
}));

// List users (admin only)
router.get('/users', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const listUsersResult = await getAuth().listUsers();
    
    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    }));
    
    res.json({
      users,
      nextPageToken: listUsersResult.pageToken,
    });
  } catch (error) {
    logger.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
}));

export const setupAuthRoutes = () => router;
