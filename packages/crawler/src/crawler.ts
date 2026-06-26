import { CrawlerError } from '@opti-core/shared';
import type { CrawlResult } from '@opti-core/shared';

const TIMEOUT_MS = 15_000;
const USER_AGENT = 'OptiCore/0.1 (business intelligence crawler; single request per domain)';

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkExists(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url);
    return res.status < 400;
  } catch {
    return false;
  }
}

export async function crawl(originUrl: string): Promise<CrawlResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(originUrl);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CrawlerError(`Failed to fetch ${originUrl}: ${msg}`, { url: originUrl }, true);
  }

  if (!response.ok && response.status !== 404) {
    throw new CrawlerError(
      `HTTP ${response.status} from ${originUrl}`,
      { url: originUrl, status: response.status },
      response.status >= 500,
    );
  }

  const html = await response.text();
  const finalUrl = response.url;
  const origin = new URL(finalUrl).origin;

  const [has_robots_txt, has_sitemap] = await Promise.all([
    checkExists(`${origin}/robots.txt`),
    checkExists(`${origin}/sitemap.xml`),
  ]);

  return {
    url: originUrl,
    final_url: finalUrl,
    html,
    status: response.status,
    has_robots_txt,
    has_sitemap,
  };
}
