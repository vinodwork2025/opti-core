import type { Lead, ProcessingJob } from '@opti-core/shared';
import { getSupabase } from './supabase';

// --- Leads ---

export async function saveLead(lead: Lead): Promise<void> {
  const { error } = await getSupabase()
    .from('leads')
    .upsert({ domain: lead.domain, data: lead }, { onConflict: 'domain' });
  if (error) throw new Error(`saveLead failed: ${error.message}`);
}

export async function getLead(domain: string): Promise<Lead | null> {
  const { data, error } = await getSupabase()
    .from('leads')
    .select('data')
    .eq('domain', domain)
    .single();
  if (error || !data) return null;
  const raw = data.data;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Lead;
}

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await getSupabase()
    .from('leads')
    .select('data')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[storage] listLeads error:', error.message, error.code);
    return [];
  }
  if (!data) return [];
  const leads = data.map((row) => {
    const raw = row.data;
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Lead;
  });
  return leads.sort((a, b) => b.opportunity_score - a.opportunity_score);
}

// --- Jobs ---

export async function saveJob(job: ProcessingJob): Promise<void> {
  const { error } = await getSupabase()
    .from('jobs')
    .upsert({ job_id: job.job_id, data: job, updated_at: new Date().toISOString() });
  if (error) throw new Error(`saveJob failed: ${error.message}`);
}

export async function getJob(jobId: string): Promise<ProcessingJob | null> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('data')
    .eq('job_id', jobId)
    .single();
  if (error || !data) return null;
  return data.data as ProcessingJob;
}
