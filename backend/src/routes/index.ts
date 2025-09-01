import { Express } from 'express';
import { setupAuthRoutes } from './auth';
import { setupLectureRoutes } from './lectures';
import { setupSubtitleRoutes } from './subtitles';
import { setupAIRoutes } from './ai';
import { setupFileRoutes } from './files';
import { setupWebVTTRoutes } from './webvtt';

export const setupRoutes = (app: Express): void => {
  // API routes
  app.use('/api/auth', setupAuthRoutes());
  app.use('/api/lectures', setupLectureRoutes());
  app.use('/api/subtitles', setupSubtitleRoutes());
  app.use('/api/ai', setupAIRoutes());
  app.use('/api/files', setupFileRoutes());
  app.use('/api/webvtt', setupWebVTTRoutes());

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });
};
