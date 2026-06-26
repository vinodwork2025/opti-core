import { NextRequest, NextResponse } from 'next/server';
import { parseCsv } from '@/lib/csv';
import { saveJob } from '@/lib/storage';
import type { ProcessingJob } from '@opti-core/shared';
import { slugify } from '@opti-core/shared';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const content = await file.text();
    const rows = parseCsv(content);

    const jobId = randomUUID();
    const job: ProcessingJob = {
      job_id: jobId,
      created_at: new Date().toISOString(),
      total: rows.length,
      completed: 0,
      failed: 0,
      status: 'pending',
      leads: rows.map((r) => ({
        domain: slugify(r.url),
        company_name: r.company_name,
        original_url: r.url,
        status: 'pending',
      })),
    };

    await saveJob(job);

    return NextResponse.json({ job_id: jobId, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
