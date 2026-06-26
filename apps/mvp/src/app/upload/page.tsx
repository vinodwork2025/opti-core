'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CsvRow } from '@opti-core/shared';

const SAMPLE_CSV = `company_name,url
Acme Interiors,acmeinteriors.in
Star Builders,starbuilders.com`;

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setPreview([]);

    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
      const companyIdx = headers.indexOf('company_name');
      const urlIdx = headers.indexOf('url');

      if (companyIdx === -1 || urlIdx === -1) {
        throw new Error('CSV must have columns: company_name, url');
      }

      const rows: CsvRow[] = lines
        .slice(1)
        .filter((l) => l.trim())
        .map((l) => {
          const parts = l.split(',');
          return {
            company_name: (parts[companyIdx] ?? '').replace(/"/g, '').trim(),
            url: (parts[urlIdx] ?? '').replace(/"/g, '').trim(),
          };
        });

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
      const data = (await res.json()) as { job_id?: string; rows?: CsvRow[]; error?: string };

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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Import Leads</h1>
      <p className="text-gray-500 text-sm mb-6">
        Upload a CSV with columns: <code className="bg-gray-100 px-1 rounded">company_name</code> and{' '}
        <code className="bg-gray-100 px-1 rounded">url</code>
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

        {preview.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Preview ({preview.length} of uploaded rows)</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">Company</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-900">{row.company_name}</td>
                      <td className="px-3 py-2 text-gray-500">{row.url}</td>
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
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Uploading…' : 'Process Leads'}
          </button>
          <button
            type="button"
            onClick={downloadSample}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Download Sample
          </button>
        </div>
      </form>
    </div>
  );
}
