import type { AIIntelligence, ExtractedSignals, Finding } from '@opti-core/shared';

export interface AIInput {
  company_name: string;
  domain: string;
  signals: ExtractedSignals;
  findings: Finding[];
  opportunity_score: number;
}

export interface AIClient {
  generateIntelligence(input: AIInput): Promise<AIIntelligence>;
}
