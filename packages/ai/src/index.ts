export type { AIClient, AIInput } from './types';
export { GeminiClient } from './adapters/gemini';

import { GeminiClient } from './adapters/gemini';
import type { AIClient } from './types';

export function createAIClient(apiKey: string): AIClient {
  return new GeminiClient(apiKey);
}
