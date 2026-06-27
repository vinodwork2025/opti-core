'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ProcessingJob } from '@opti-core/shared';

type LeadStatus = ProcessingJob['leads'][number]['status'];

function StatusIcon({ status }: { status: LeadStatus }) {
  if (status === 'done') return <span className="text-green-500 font-bold">✓</span>;
  if (status === 'failed') return <span className="text-red-500 font-bold">✗</span>;
  if (status === 'processing') return <span className="animate-pulse text-blue-500">●</span>;
  return <span className="text-gray-300">○</span>;
}

function ProcessingContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const router = useRouter();
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!jobId || started.current) return;
    started.current = true;

    async function run() {
      const res = await fetch(`/api/jobs/${jobId}`);
      const initialJob = (await res.json()) as ProcessingJob;
      setJob(initialJob);

      const updatedJob = { ...initialJob };

      for (let i = 0; i < updatedJob.leads.length; i++) {
        const lead = updatedJob.leads[i];
        if (!lead) continue;

        // Mark as processing in UI
        updatedJob.leads = updatedJob.leads.map((l, idx) =>
          idx === i ? { ...l, status: 'processing' as const } : l,
        );
        setJob({ ...updatedJob });

        try {
          const processRes = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_name: lead.company_name,
              url: lead.original_url,
              no_website: lead.no_website,
              apify_meta: lead.apify_meta,
            }),
          });
          const result = (await processRes.json()) as { error?: string };
          const status = processRes.ok ? ('done' as const) : ('failed' as const);
          const error = result.error;
          if (error) console.error(`[opti-core] ${lead.company_name}:`, error);

          await fetch(`/api/jobs/${jobId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: lead.domain, status, error }),
          });

          updatedJob.leads = updatedJob.leads.map((l, idx) =>
            idx === i ? { ...l, status, error } : l,
          );
          if (status === 'done') updatedJob.completed++;
          else updatedJob.failed++;
        } catch {
          updatedJob.leads = updatedJob.leads.map((l, idx) =>
            idx === i ? { ...l, status: 'failed' as const, error: 'Network error' } : l,
          );
          updatedJob.failed++;
        }

        setJob({ ...updatedJob });

        // Stay under Gemini free-tier 15 RPM limit
        if (i < updatedJob.leads.length - 1) {
          await new Promise((r) => setTimeout(r, 4000));
        }
      }

      updatedJob.status = 'done';
      setJob({ ...updatedJob });
      setTimeout(() => router.push('/'), 2000);
    }

    run().catch(() => router.push('/'));
  }, [jobId, router]);

  if (!job) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-500 mt-3 text-sm">Loading…</p>
      </div>
    );
  }

  const done = job.completed + job.failed;
  const progress = job.total > 0 ? Math.round((done / job.total) * 100) : 0;
  const isDone = job.status === 'done';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Processing Leads</h1>
      <p className="text-gray-500 text-sm mb-6">
        {isDone
          ? `Complete — ${job.completed} succeeded, ${job.failed} failed. Redirecting…`
          : `Processing ${done + 1} of ${job.total}…`}
      </p>

      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {job.leads.map((lead, i) => (
          <div
            key={lead.domain}
            className={`flex items-center gap-3 px-5 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}
          >
            <span className="w-5 text-center text-sm">
              <StatusIcon status={lead.status} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.company_name}</p>
                {lead.no_website && (
                  <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                    HOT
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {lead.no_website ? 'No website' : lead.original_url}
              </p>
            </div>
            {lead.error && (
              <p className="text-xs text-red-500 break-all">{lead.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500 text-sm">Loading…</div>}>
      <ProcessingContent />
    </Suspense>
  );
}
