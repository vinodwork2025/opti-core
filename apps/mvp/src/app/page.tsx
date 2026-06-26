import Link from 'next/link';
import { listLeads } from '@/lib/storage';
import type { Lead } from '@opti-core/shared';

export const dynamic = 'force-dynamic';

function ScoreBadge({ score }: { score: number }) {
  if (score >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        {score} — High Opportunity
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
        {score} — Good Opportunity
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      {score} — Low Priority
    </span>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const topFinding = lead.findings[0];
  const date = new Date(lead.processed_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link href={`/leads/${lead.domain}`} className="block">
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{lead.company_name}</p>
            <p className="text-sm text-gray-500 truncate">{lead.domain}</p>
            {topFinding && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                <span className="text-red-500 font-medium">↑ </span>
                {topFinding.label}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <ScoreBadge score={lead.opportunity_score} />
            <span className="text-xs text-gray-400">{date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const leads = await listLeads();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">{leads.length} leads processed, sorted by opportunity</p>
        </div>
        <Link
          href="/upload"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Upload CSV
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">No leads yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload a CSV to start processing businesses</p>
          <Link
            href="/upload"
            className="inline-block mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Upload CSV
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {leads.map((lead) => (
            <LeadRow key={lead.domain} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
