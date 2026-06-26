import { ValidationError } from '@opti-core/shared';
import type { CsvRow } from '@opti-core/shared';

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new ValidationError('CSV must have a header row and at least one data row');
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/"/g, '').trim());
  const companyIdx = headers.indexOf('company_name');
  const urlIdx = headers.indexOf('url');

  if (companyIdx === -1) throw new ValidationError('CSV missing required column: company_name');
  if (urlIdx === -1) throw new ValidationError('CSV missing required column: url');

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const values = parseLine(line);
    const company_name = (values[companyIdx] ?? '').replace(/"/g, '').trim();
    const url = (values[urlIdx] ?? '').replace(/"/g, '').trim();

    if (!company_name) throw new ValidationError(`Row ${i + 1}: company_name is empty`);
    if (!url) throw new ValidationError(`Row ${i + 1}: url is empty`);

    rows.push({ company_name, url });
  }

  if (rows.length === 0) throw new ValidationError('CSV contains no data rows');

  return rows;
}
