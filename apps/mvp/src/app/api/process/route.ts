import { NextRequest, NextResponse } from 'next/server';
import { crawl } from '@opti-core/crawler';
import { parse } from '@opti-core/parser';
import { evaluate } from '@opti-core/rules';
import { createAIClient } from '@opti-core/ai';
import { slugify, normalizeUrl, logger } from '@opti-core/shared';
import type { Lead, ApifyMeta, ExtractedSignals } from '@opti-core/shared';
import { saveLead } from '@/lib/storage';

function noWebsiteSignals(apify_meta?: ApifyMeta): ExtractedSignals {
  return {
    title: null,
    meta_description: null,
    h1: null,
    h1_count: 0,
    contact_phone: apify_meta?.gmaps_phone ?? null,
    contact_email: null,
    contact_address: apify_meta?.street ?? null,
    whatsapp_link: null,
    social_links: [],
    is_https: false,
    has_contact_form: false,
    schema_types: [],
    has_robots_txt: false,
    has_sitemap: false,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { company_name, url, no_website, apify_meta } = (await req.json()) as {
    company_name: string;
    url: string;
    no_website?: boolean;
    apify_meta?: ApifyMeta;
  };

  if (!company_name) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 });
  }
  if (!no_website && !url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const domain = no_website ? slugify(company_name) : slugify(url);

  try {
    let signals: ExtractedSignals;
    let findings: ReturnType<typeof evaluate>['findings'];
    let opportunity_score: number;

    if (no_website) {
      logger.info('Processing no-website lead', { domain });
      signals = noWebsiteSignals(apify_meta);
      const evaluation = evaluate(signals);
      findings = evaluation.findings;
      // No website = maximum opportunity — floor at 85
      opportunity_score = Math.max(evaluation.opportunity_score, 85);
    } else {
      const normalizedUrl = normalizeUrl(url);
      logger.info('Processing lead', { domain, url: normalizedUrl });
      const crawlResult = await crawl(normalizedUrl);
      signals = parse(crawlResult);
      const evaluation = evaluate(signals);
      findings = evaluation.findings;
      opportunity_score = evaluation.opportunity_score;
    }

    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
    const aiClient = createAIClient(apiKey);
    const intelligence = await aiClient.generateIntelligence({
      company_name,
      domain,
      signals,
      findings,
      opportunity_score,
      apify_meta,
      no_website,
    });

    const lead: Lead = {
      schema_version: '1.0',
      domain,
      company_name,
      processed_at: new Date().toISOString(),
      ...(no_website ? { no_website: true } : {}),
      signals,
      findings,
      opportunity_score,
      intelligence,
    };

    await saveLead(lead);

    logger.info('Lead processed', { domain, opportunity_score, no_website });

    return NextResponse.json({ success: true, domain, opportunity_score });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    logger.error('Lead failed', { domain, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
