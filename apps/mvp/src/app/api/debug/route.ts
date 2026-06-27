import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(): Promise<NextResponse> {
  try {
    const sb = getSupabase();

    const { data, error, count } = await sb
      .from('leads')
      .select('domain, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      error: error ? { message: error.message, code: error.code, details: error.details } : null,
      count,
      rows: data,
      supabase_url: process.env['NEXT_PUBLIC_SUPABASE_URL']?.slice(0, 30) + '...',
    });
  } catch (err) {
    return NextResponse.json({ fatal: err instanceof Error ? err.message : String(err) });
  }
}
