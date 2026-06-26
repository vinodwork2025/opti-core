import type { Finding } from '@opti-core/shared';

const SEVERITY_WEIGHT: Record<string, number> = {
  high: 25,
  medium: 15,
  low: 5,
};

export function calculateScore(findings: Finding[]): number {
  const raw = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] ?? 0), 0);
  return Math.min(100, raw);
}
