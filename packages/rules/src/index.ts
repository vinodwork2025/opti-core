import { evaluateRules } from './rules';
import { calculateScore } from './score';
import type { ExtractedSignals, Finding } from '@opti-core/shared';

export interface RuleEvaluation {
  findings: Finding[];
  opportunity_score: number;
}

export function evaluate(signals: ExtractedSignals): RuleEvaluation {
  const findings = evaluateRules(signals);
  const opportunity_score = calculateScore(findings);
  return { findings, opportunity_score };
}

export { evaluateRules } from './rules';
export { calculateScore } from './score';
