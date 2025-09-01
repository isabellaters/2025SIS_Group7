import admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App;

export const setupFirebase = (): void => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID is required');
    }

    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('FIREBASE_PRIVATE_KEY is required');
    }

    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL is required');
    }

    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    logger.info('✅ Firebase initialized successfully');
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

export const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call setupFirebase() first.');
  }
  return firebaseApp;
};

export const getFirestore = (): admin.firestore.Firestore => {
  return getFirebaseApp().firestore();
};

export const getAuth = (): admin.auth.Auth => {
  return getFirebaseApp().auth();
};

export const getStorage = (): admin.storage.Storage => {
  return getFirebaseApp().storage();
};

export const getBucket = (): admin.storage.Bucket => {
  return getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
};
