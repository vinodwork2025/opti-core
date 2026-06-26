import { NextRequest, NextResponse } from 'next/server';
import { getJob, saveJob } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } },
): Promise<NextResponse> {
  const job = await getJob(params.jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { jobId: string } },
): Promise<NextResponse> {
  const job = await getJob(params.jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const update = (await req.json()) as {
    domain: string;
    status: 'done' | 'failed';
    error?: string;
  };

  const leadIndex = job.leads.findIndex((l) => l.domain === update.domain);
  if (leadIndex !== -1 && job.leads[leadIndex]) {
    job.leads[leadIndex].status = update.status;
    if (update.error) job.leads[leadIndex].error = update.error;
  }

  if (update.status === 'done') job.completed++;
  if (update.status === 'failed') job.failed++;

  const allDone = job.leads.every((l) => l.status === 'done' || l.status === 'failed');
  if (allDone) job.status = 'done';

  await saveJob(job);
  return NextResponse.json(job);
}
