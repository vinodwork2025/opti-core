import { OptiError } from './errors.js';

export interface AppConfig {
  aiProvider: 'gemini' | 'claude' | 'openai';
  geminiApiKey: string;
  logLevel: string;
}

export function getConfig(): AppConfig {
  const aiProvider = (process.env['AI_PROVIDER'] ?? 'gemini') as AppConfig['aiProvider'];
  const geminiApiKey = process.env['GEMINI_API_KEY'] ?? '';

  if (aiProvider === 'gemini' && !geminiApiKey) {
    throw new OptiError(
      'CONFIG_MISSING',
      'GEMINI_API_KEY is required when AI_PROVIDER=gemini',
      { AI_PROVIDER: aiProvider },
      false,
    );
  }

  return {
    aiProvider,
    geminiApiKey,
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
  };
}
