import type { AIIntelligence, ExtractedSignals, Finding, ApifyMeta } from '@opti-core/shared';

export interface AIInput {
  company_name: string;
  domain: string;
  signals: ExtractedSignals;
  findings: Finding[];
  opportunity_score: number;
  apify_meta?: ApifyMeta;
}

export interface AIClient {
  generateIntelligence(input: AIInput): Promise<AIIntelligence>;
}
