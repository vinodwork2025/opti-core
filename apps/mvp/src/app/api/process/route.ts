import { NextRequest, NextResponse } from 'next/server';
import { crawl } from '@opti-core/crawler';
import { parse } from '@opti-core/parser';
import { evaluate } from '@opti-core/rules';
import { createAIClient } from '@opti-core/ai';
import { slugify, normalizeUrl, logger } from '@opti-core/shared';
import type { Lead, ApifyMeta } from '@opti-core/shared';
import { saveLead } from '@/lib/storage';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { company_name, url, apify_meta } = (await req.json()) as {
    company_name: string;
    url: string;
    apify_meta?: ApifyMeta;
  };

  if (!company_name || !url) {
    return NextResponse.json({ error: 'company_name and url are required' }, { status: 400 });
  }

  const domain = slugify(url);

  try {
    const normalizedUrl = normalizeUrl(url);

    logger.info('Processing lead', { domain, url: normalizedUrl });

    const crawlResult = await crawl(normalizedUrl);
    const signals = parse(crawlResult);
    const { findings, opportunity_score } = evaluate(signals);

    const apiKey = process.env['GEMINI_API_KEY'] ?? '';
    const aiClient = createAIClient(apiKey);
    const intelligence = await aiClient.generateIntelligence({
      company_name,
      domain,
      signals,
      findings,
      opportunity_score,
      apify_meta,
    });

    const lead: Lead = {
      schema_version: '1.0',
      domain,
      company_name,
      processed_at: new Date().toISOString(),
      signals,
      findings,
      opportunity_score,
      intelligence,
    };

    await saveLead(lead);

    logger.info('Lead processed', { domain, opportunity_score });

    return NextResponse.json({ success: true, domain, opportunity_score });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    logger.error('Lead failed', { domain, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
