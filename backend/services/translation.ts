import { v2 } from '@google-cloud/translate';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

export class TranslationService {
  private translate: v2.Translate;

  constructor() {
    try {
      // Load and parse credentials
      const credentialsPath = path.join(__dirname, '..', 'google-credentials.json');
      const credentialsJson = fs.readFileSync(credentialsPath, 'utf-8');
      const credentials = JSON.parse(credentialsJson);

      // Create JWT client
      const jwtClient = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      // Create Translation client with JWT auth
      this.translate = new v2.Translate({
        authClient: jwtClient,
        projectId: credentials.project_id
      });

      console.log('Translation service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize translation service:', error);
      throw error;
    }
  }

  /**
   * Translate text to target language
   * @param text - Text to translate
   * @param targetLanguage - Target language code (e.g., 'es', 'fr', 'zh-CN')
   * @param sourceLanguage - Optional source language code (auto-detected if not provided)
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    try {
      const options: any = {
        to: targetLanguage,
      };

      if (sourceLanguage) {
        options.from = sourceLanguage;
      }

      const [translation, metadata] = await this.translate.translate(text, options);

      return {
        translatedText: Array.isArray(translation) ? translation[0] : translation,
        detectedSourceLanguage: metadata?.data?.translations?.[0]?.detectedSourceLanguage
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * Get list of supported languages
   */
  async getSupportedLanguages(): Promise<any[]> {
    try {
      const [languages] = await this.translate.getLanguages();
      return languages;
    } catch (error) {
      console.error('Error fetching supported languages:', error);
      throw error;
    }
  }
}
