import type { ExtractedSignals, Finding } from '@opti-core/shared';

type Rule = (signals: ExtractedSignals) => Finding | null;

const rules: Rule[] = [
  (s) =>
    !s.has_contact_form && !s.contact_phone && !s.contact_email
      ? {
          rule_id: 'missing-cta',
          label: 'No clear way to contact the business',
          business_impact:
            'Visitors who are ready to enquire cannot find a way to reach out, so they leave and call a competitor instead.',
          severity: 'high',
        }
      : null,

  (s) =>
    !s.contact_phone && !s.has_contact_form && !s.whatsapp_link
      ? {
          rule_id: 'poor-contactability',
          label: 'Business is difficult to reach',
          business_impact:
            'No phone, no WhatsApp, and no contact form means qualified leads drop off before they convert.',
          severity: 'high',
        }
      : null,

  (s) =>
    !s.h1 || s.h1.length < 10
      ? {
          rule_id: 'weak-messaging',
          label: 'Value proposition is unclear',
          business_impact:
            'Visitors cannot immediately understand what the business does or why they should choose it, reducing the chance they stay on the page.',
          severity: 'high',
        }
      : null,

  (s) =>
    !s.whatsapp_link
      ? {
          rule_id: 'missing-whatsapp',
          label: 'No WhatsApp contact option',
          business_impact:
            'WhatsApp is the primary communication channel for business enquiries in India. Missing it means losing leads who prefer it over phone calls or forms.',
          severity: 'medium',
        }
      : null,

  (s) =>
    !s.schema_types.some((t) =>
      ['Review', 'AggregateRating', 'Testimonial'].includes(t),
    ) && !s.social_links.length
      ? {
          rule_id: 'weak-trust',
          label: 'Low trust signals on the website',
          business_impact:
            'Without visible reviews, testimonials, or social proof, first-time visitors have no reason to trust the business over a competitor.',
          severity: 'medium',
        }
      : null,

  (s) =>
    s.schema_types.length === 0
      ? {
          rule_id: 'no-schema',
          label: 'No structured data (schema markup)',
          business_impact:
            'Without schema markup, the business is invisible to AI assistants like ChatGPT and Google AI Overviews when customers ask for recommendations.',
          severity: 'medium',
        }
      : null,

  (s) =>
    !s.has_sitemap && !s.has_robots_txt
      ? {
          rule_id: 'poor-seo-foundation',
          label: 'Basic SEO infrastructure is missing',
          business_impact:
            'No sitemap and no robots.txt means search engines cannot efficiently crawl and index the site, reducing organic visibility.',
          severity: 'low',
        }
      : null,
];

export function evaluateRules(signals: ExtractedSignals): Finding[] {
  return rules.flatMap((rule) => {
    const finding = rule(signals);
    return finding ? [finding] : [];
  });
}
