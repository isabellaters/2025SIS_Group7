import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    displayName?: string;
    role?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Try Firebase token first
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || undefined,
        role: decodedToken.role || 'user',
      };
      next();
      return;
    } catch (firebaseError) {
      logger.warn('Firebase token verification failed, trying JWT');
    }

    // Try JWT token as fallback
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(token, jwtSecret) as any;
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.displayName,
        role: decoded.role || 'user',
      };
      next();
      return;
    } catch (jwtError) {
      logger.error('JWT token verification failed:', jwtError);
    }

    res.status(401).json({ error: 'Invalid token' });
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(); // Continue without authentication
      return;
    }

    const token = authHeader.substring(7);

    // Try Firebase token first
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || undefined,
        role: decodedToken.role || 'user',
      };
      next();
      return;
    } catch (firebaseError) {
      // Continue without authentication
    }

    // Try JWT token as fallback
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          displayName: decoded.displayName,
          role: decoded.role || 'user',
        };
      }
    } catch (jwtError) {
      // Continue without authentication
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue without authentication
  }
};

export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
