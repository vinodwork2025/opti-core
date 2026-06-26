import * as cheerio from 'cheerio';
import type { ExtractedSignals } from '@opti-core/shared';
import type { CrawlResult } from '@opti-core/crawler';

const PHONE_RE = /(?:\+91[\s-]?)?(?:\(0\d{2,4}\)[\s-]?)?\d{10}|\d{3,4}[\s-]\d{3,4}[\s-]\d{4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const SOCIAL_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'pinterest.com',
];

export function parse(result: CrawlResult): ExtractedSignals {
  const $ = cheerio.load(result.html);

  const title = $('title').first().text().trim() || null;
  const meta_description =
    $('meta[name="description"]').attr('content')?.trim() ?? null;

  const h1Elements = $('h1');
  const h1_count = h1Elements.length;
  const h1 = h1Elements.first().text().trim() || null;

  // Contact extraction from visible text and href attributes
  const bodyText = $('body').text();
  const phones = bodyText.match(PHONE_RE);
  const contact_phone = phones?.[0]?.trim() ?? null;

  const emailFromMailto = $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '') ?? null;
  const emailFromText = bodyText.match(EMAIL_RE)?.[0] ?? null;
  const contact_email = emailFromMailto ?? emailFromText ?? null;

  // Address: look for schema address or common patterns
  const addressSchema = $('*[itemprop="streetAddress"]').first().text().trim() || null;
  const contact_address = addressSchema;

  // WhatsApp: wa.me links or whatsapp.com links
  const whatsappEl = $('a[href*="wa.me"], a[href*="whatsapp.com/send"], a[href*="api.whatsapp.com"]').first();
  const whatsapp_link = whatsappEl.attr('href') ?? null;

  // Social links
  const social_links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (SOCIAL_DOMAINS.some((d) => href.includes(d))) {
      if (!social_links.includes(href)) social_links.push(href);
    }
  });

  const is_https = result.final_url.startsWith('https://');

  const has_contact_form =
    $('form').length > 0 &&
    ($('input[type="email"], input[name*="email"], input[name*="phone"]').length > 0 ||
      $('textarea').length > 0);

  // JSON-LD schema types
  const schema_types: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}') as Record<string, unknown>;
      const type = data['@type'];
      if (typeof type === 'string') schema_types.push(type);
      if (Array.isArray(type)) schema_types.push(...(type as string[]));
    } catch {
      // malformed JSON-LD — skip
    }
  });

  return {
    title,
    meta_description,
    h1,
    h1_count,
    contact_phone,
    contact_email,
    contact_address,
    whatsapp_link,
    social_links,
    is_https,
    has_contact_form,
    schema_types,
    has_robots_txt: result.has_robots_txt,
    has_sitemap: result.has_sitemap,
  };
}
