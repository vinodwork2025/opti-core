'use client';

import { useState } from 'react';

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
      style={
        copied
          ? { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }
          : { background: '#f9fafb', color: '#374151', borderColor: '#e5e7eb' }
      }
    >
      {copied ? '✓ Copied' : `Copy ${label}`}
    </button>
  );
}
