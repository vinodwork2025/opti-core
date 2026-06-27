import { ValidationError } from '@opti-core/shared';
import type { CsvRow, ApifyMeta } from '@opti-core/shared';

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

function cleanVal(v: string | undefined): string {
  return (v ?? '').replace(/^"+|"+$/g, '').trim();
}

function parseApifyCsv(headers: string[], lines: string[]): CsvRow[] {
  const idx = (col: string) => headers.indexOf(col);

  const titleIdx = idx('title');
  const websiteIdx = idx('website');
  const phoneIdx = idx('phone');
  const scoreIdx = idx('totalscore');
  const reviewsIdx = idx('reviewscount');
  const cityIdx = idx('city');
  const stateIdx = idx('state');
  const streetIdx = idx('street');

  // category columns: categories/0 .. categories/9
  const catIndexes: number[] = [];
  for (let n = 0; n <= 9; n++) {
    const ci = idx(`categories/${n}`);
    if (ci !== -1) catIndexes.push(ci);
  }

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const values = parseLine(line);
    const company_name = cleanVal(values[titleIdx]);
    const url = cleanVal(values[websiteIdx]);

    if (!company_name) continue;
    if (!url) continue; // no website = can't crawl, skip silently

    const apify_meta: ApifyMeta = {};

    const score = parseFloat(cleanVal(values[scoreIdx]));
    if (!isNaN(score) && score > 0) apify_meta.google_rating = score;

    const reviews = parseInt(cleanVal(values[reviewsIdx]), 10);
    if (!isNaN(reviews) && reviews > 0) apify_meta.review_count = reviews;

    const phone = cleanVal(values[phoneIdx]);
    if (phone) apify_meta.gmaps_phone = phone;

    const city = cleanVal(values[cityIdx]);
    if (city) apify_meta.city = city;

    const state = cleanVal(values[stateIdx]);
    if (state) apify_meta.state = state;

    const street = cleanVal(values[streetIdx]);
    if (street) apify_meta.street = street;

    const cats = catIndexes
      .map((ci) => cleanVal(values[ci]))
      .filter(Boolean)
      .filter((v, pos, arr) => arr.indexOf(v) === pos); // dedupe
    if (cats.length > 0) apify_meta.categories = cats;

    rows.push({ company_name, url, apify_meta });
  }

  return rows;
}

function parseStandardCsv(headers: string[], lines: string[]): CsvRow[] {
  const companyIdx = headers.indexOf('company_name');
  const urlIdx = headers.indexOf('url');

  if (companyIdx === -1) throw new ValidationError('CSV missing required column: company_name');
  if (urlIdx === -1) throw new ValidationError('CSV missing required column: url');

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const values = parseLine(line);
    const company_name = cleanVal(values[companyIdx]);
    const url = cleanVal(values[urlIdx]);

    if (!company_name) throw new ValidationError(`Row ${i + 1}: company_name is empty`);
    if (!url) throw new ValidationError(`Row ${i + 1}: url is empty`);

    rows.push({ company_name, url });
  }

  return rows;
}

export function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new ValidationError('CSV must have a header row and at least one data row');
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/^"+|"+$/g, '').trim());

  const isApify = headers.includes('title') && headers.includes('website');
  const rows = isApify
    ? parseApifyCsv(headers, lines)
    : parseStandardCsv(headers, lines);

  if (rows.length === 0) {
    throw new ValidationError(
      isApify
        ? 'No leads with websites found in CSV. Leads without websites are skipped.'
        : 'CSV contains no data rows',
    );
  }

  return rows;
}
