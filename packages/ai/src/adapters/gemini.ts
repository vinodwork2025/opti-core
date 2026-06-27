import {
  GoogleGenerativeAI,
  SchemaType,
} from '@google/generative-ai';
import { AIError } from '@opti-core/shared';
import type { AIIntelligence } from '@opti-core/shared';
import type { AIClient, AIInput } from '../types';

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    executive_summary: { type: SchemaType.STRING },
    strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    discovery_questions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    email: {
      type: SchemaType.OBJECT,
      properties: {
        subject: { type: SchemaType.STRING },
        body: { type: SchemaType.STRING },
      },
      required: ['subject', 'body'],
    },
    whatsapp: { type: SchemaType.STRING },
    call_brief: { type: SchemaType.STRING },
  },
  required: [
    'executive_summary',
    'strengths',
    'opportunities',
    'discovery_questions',
    'email',
    'whatsapp',
    'call_brief',
  ],
};

function buildPrompt(input: AIInput): string {
  const findingsSummary = input.findings
    .map((f) => `[${f.severity.toUpperCase()}] ${f.label}: ${f.business_impact}`)
    .join('\n');

  const signalsSummary = [
    `Title: ${input.signals.title ?? 'Not found'}`,
    `H1: ${input.signals.h1 ?? 'Missing'}`,
    `HTTPS: ${input.signals.is_https ? 'Yes' : 'No'}`,
    `Contact phone: ${input.signals.contact_phone ?? input.apify_meta?.gmaps_phone ?? 'Not found'}`,
    `Contact email: ${input.signals.contact_email ?? 'Not found'}`,
    `WhatsApp: ${input.signals.whatsapp_link ? 'Present' : 'Missing'}`,
    `Contact form: ${input.signals.has_contact_form ? 'Present' : 'Missing'}`,
    `Schema types: ${input.signals.schema_types.length > 0 ? input.signals.schema_types.join(', ') : 'None'}`,
    `Social links: ${input.signals.social_links.length > 0 ? input.signals.social_links.join(', ') : 'None'}`,
  ].join('\n');

  const apifySection = input.apify_meta
    ? (() => {
        const m = input.apify_meta;
        const lines: string[] = [];
        if (m.google_rating !== undefined)
          lines.push(`Google Rating: ${m.google_rating}/5 (${m.review_count ?? 0} reviews)`);
        if (m.categories?.length)
          lines.push(`Business Categories: ${m.categories.join(', ')}`);
        if (m.city || m.state)
          lines.push(`Location: ${[m.city, m.state].filter(Boolean).join(', ')}`);
        if (m.street) lines.push(`Address: ${m.street}`);
        if (m.gmaps_phone) lines.push(`Phone (Google): ${m.gmaps_phone}`);
        return lines.length > 0 ? `\nGOOGLE BUSINESS PROFILE:\n${lines.join('\n')}` : '';
      })()
    : '';

  const noWebsiteWarning = input.no_website
    ? `\n⚠️ CRITICAL: This business has NO WEBSITE at all. They are completely invisible online — cannot be found on Google search, AI assistants, or any digital channel. This is a maximum-priority opportunity. Frame your entire report around helping them establish their first digital presence.\n`
    : '';

  return `You are a senior business development consultant at Optiscale Advisors, a digital advisory firm that helps businesses in India grow their customer base through better digital presence, AI search visibility, and lead conversion.

You have analyzed the ${input.no_website ? 'digital footprint' : 'website'} of a prospective client. Your job is to prepare a business intelligence report that helps our founder have a credible, informed, and personalized first conversation with this business.
${noWebsiteWarning}
COMPANY: ${input.company_name}
WEBSITE: ${input.no_website ? 'NONE — business has no website' : input.domain}
OPPORTUNITY SCORE: ${input.opportunity_score}/100 (higher = more room to help)

WEBSITE SIGNALS:
${signalsSummary}
${apifySection}
FINDINGS FROM ANALYSIS:
${findingsSummary || 'No significant issues found.'}

INSTRUCTIONS:
- Write like a business consultant, not a software tool
- Focus on business outcomes and revenue impact, not technical details
- Be specific to this company — no generic advice
- The email and WhatsApp must feel personally researched, not templated
- Discovery questions should open a genuine conversation
- Keep the call brief focused on the first 90 seconds of a cold call
- Opportunities should explain the business cost of each gap, not just name it

Produce a business intelligence report as JSON.`;
}

export class GeminiClient implements AIClient {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateIntelligence(input: AIInput): Promise<AIIntelligence> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      },
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await model.generateContent(buildPrompt(input));
        const text = result.response.text();
        return JSON.parse(text) as AIIntelligence;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === 1) continue;
      }
    }

    throw new AIError(
      `Gemini failed after 2 attempts: ${lastError?.message ?? 'unknown'}`,
      { domain: input.domain },
      true,
    );
  }
}
