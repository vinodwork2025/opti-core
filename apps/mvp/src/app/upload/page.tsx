'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PreviewRow {
  company_name: string;
  url: string;
  no_website: boolean;
}

const SAMPLE_CSV = `company_name,url
Acme Interiors,acmeinteriors.in
Star Builders,starbuilders.com`;

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
    else { current += char; }
  }
  values.push(current.trim());
  return values;
}

function clean(v: string | undefined): string {
  return (v ?? '').replace(/^"+|"+$/g, '').trim();
}

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [formatDetected, setFormatDetected] = useState<'apify' | 'standard' | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setPreview([]);
    setFormatDetected(null);

    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

      const headers = parseLine(lines[0]).map((h) => clean(h).toLowerCase());
      const isApify = headers.includes('title') && headers.includes('website');
      const isStandard = headers.includes('company_name') && headers.includes('url');

      if (!isApify && !isStandard) {
        throw new Error(
          'Unrecognised format. Expected Apify CSV (title, website columns) or standard CSV (company_name, url columns).',
        );
      }

      setFormatDetected(isApify ? 'apify' : 'standard');

      const rows: PreviewRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        const vals = parseLine(line);

        let company_name: string;
        let url: string;

        if (isApify) {
          company_name = clean(vals[headers.indexOf('title')]);
          url = clean(vals[headers.indexOf('website')]);
        } else {
          company_name = clean(vals[headers.indexOf('company_name')]);
          url = clean(vals[headers.indexOf('url')]);
        }

        if (!company_name) continue;
        rows.push({ company_name, url, no_website: !url });
      }

      if (rows.length === 0) throw new Error('No data rows found in CSV');

      setTotalCount(rows.length);
      setPreview(rows.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid CSV');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a CSV file'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = (await res.json()) as { job_id?: string; error?: string };

      if (!res.ok || !data.job_id) {
        throw new Error(data.error ?? 'Upload failed');
      }

      router.push(`/processing?jobId=${data.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setLoading(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sample-leads.csv';
    a.click();
  }

  const hotCount = preview.filter((r) => r.no_website).length;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Import Leads</h1>
      <p className="text-gray-500 text-sm mb-6">
        Accepts <strong>Apify Google Maps CSV</strong> or standard CSV with{' '}
        <code className="bg-gray-100 px-1 rounded">company_name</code> +{' '}
        <code className="bg-gray-100 px-1 rounded">url</code> columns.
        Leads with no website are processed as <span className="font-semibold text-red-600">HOT</span> leads.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {formatDetected && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>
              Format: <strong>{formatDetected === 'apify' ? 'Apify Google Maps' : 'Standard'}</strong>
              {' · '}{totalCount} leads
              {hotCount > 0 && (
                <span className="ml-2 font-bold text-red-600">{hotCount} HOT (no website)</span>
              )}
            </span>
          </div>
        )}

        {preview.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Preview (first {preview.length} of {totalCount})
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">Company</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">Website</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-900 flex items-center gap-2">
                        {row.company_name}
                        {row.no_website && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            HOT
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {row.url || <span className="italic text-red-400">No website</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || preview.length === 0}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Uploading…' : 'Process Leads'}
          </button>
          <button
            type="button"
            onClick={downloadSample}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Sample CSV
          </button>
        </div>
      </form>
    </div>
  );
}
