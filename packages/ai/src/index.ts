export type { AIClient, AIInput } from './types.js';
export { GeminiClient } from './adapters/gemini.js';

import { GeminiClient } from './adapters/gemini.js';
import type { AIClient } from './types.js';

export function createAIClient(apiKey: string): AIClient {
  return new GeminiClient(apiKey);
}
