import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLead } from '@/lib/storage';
import type { Finding } from '@opti-core/shared';
import { CopyButton } from '@/components/CopyButton';

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-gray-500';
  const label = score >= 70 ? 'High Opportunity' : score >= 40 ? 'Good Opportunity' : 'Low Priority';
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
      <p className={`text-6xl font-bold ${color}`}>{score}</p>
      <p className={`text-sm font-semibold mt-1 ${color}`}>{label}</p>
      <p className="text-xs text-gray-400 mt-1">Opportunity Score</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Finding['severity'] }) {
  const styles = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-orange-50 text-orange-700 border-orange-200',
    low: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: { domain: string } }) {
  const lead = await getLead(params.domain);
  if (!lead) notFound();

  const date = new Date(lead.processed_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-4xl">
      {/* Back + header */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          ← All Leads
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{lead.company_name}</h1>
        <p className="text-gray-500 text-sm">{lead.domain} · Analysed {date}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <ScoreRing score={lead.opportunity_score} />

          <Section title="Quick Signals">
            <dl className="space-y-2 text-sm">
              {[
                ['HTTPS', lead.signals.is_https ? '✓ Yes' : '✗ No'],
                ['H1', lead.signals.h1 ?? '✗ Missing'],
                ['Phone', lead.signals.contact_phone ?? '—'],
                ['Email', lead.signals.contact_email ?? '—'],
                ['WhatsApp', lead.signals.whatsapp_link ? '✓ Present' : '✗ Missing'],
                ['Contact Form', lead.signals.has_contact_form ? '✓ Yes' : '✗ No'],
                ['Schema Types', lead.signals.schema_types.join(', ') || '—'],
                ['robots.txt', lead.signals.has_robots_txt ? '✓' : '✗'],
                ['sitemap.xml', lead.signals.has_sitemap ? '✓' : '✗'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-gray-800 font-medium text-right truncate max-w-32">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 flex flex-col gap-5">
          <Section title="Executive Summary">
            <p className="text-gray-700 leading-relaxed">{lead.intelligence.executive_summary}</p>
          </Section>

          {lead.intelligence.strengths.length > 0 && (
            <Section title="Strengths">
              <ul className="space-y-2">
                {lead.intelligence.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {lead.findings.length > 0 && (
            <Section title="Findings">
              <div className="space-y-3">
                {lead.findings.map((f) => (
                  <div key={f.rule_id} className="flex gap-3">
                    <SeverityBadge severity={f.severity} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{f.label}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{f.business_impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {lead.intelligence.opportunities.length > 0 && (
            <Section title="Opportunities">
              <ul className="space-y-2">
                {lead.intelligence.opportunities.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                    {o}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {lead.intelligence.discovery_questions.length > 0 && (
            <Section title="Discovery Questions">
              <ol className="space-y-2 list-decimal list-inside">
                {lead.intelligence.discovery_questions.map((q, i) => (
                  <li key={i} className="text-sm text-gray-700">{q}</li>
                ))}
              </ol>
            </Section>
          )}

          {/* Outreach */}
          <Section title="Email Outreach">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Subject</p>
                <div className="flex items-start gap-2">
                  <p className="text-sm font-semibold text-gray-800 flex-1">
                    {lead.intelligence.email.subject}
                  </p>
                  <CopyButton text={lead.intelligence.email.subject} label="Subject" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Body</p>
                <div className="flex items-start gap-2">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap flex-1 font-sans leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {lead.intelligence.email.body}
                  </pre>
                  <CopyButton text={lead.intelligence.email.body} label="Email" />
                </div>
              </div>
            </div>
          </Section>

          <Section title="WhatsApp Message">
            <div className="flex items-start gap-2">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap flex-1 font-sans bg-gray-50 p-3 rounded-lg border border-gray-100">
                {lead.intelligence.whatsapp}
              </pre>
              <CopyButton text={lead.intelligence.whatsapp} label="WhatsApp" />
            </div>
          </Section>

          <Section title="Call Brief">
            <div className="flex items-start gap-2">
              <p className="text-sm text-gray-700 leading-relaxed flex-1">
                {lead.intelligence.call_brief}
              </p>
              <CopyButton text={lead.intelligence.call_brief} label="Brief" />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
