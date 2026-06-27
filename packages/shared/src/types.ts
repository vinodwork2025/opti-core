export interface ApifyMeta {
  google_rating?: number;
  review_count?: number;
  categories?: string[];
  city?: string;
  state?: string;
  street?: string;
  gmaps_phone?: string;
}

export interface CsvRow {
  company_name: string;
  url: string;
  apify_meta?: ApifyMeta;
}

export interface CrawlResult {
  url: string;
  final_url: string;
  html: string;
  status: number;
  has_robots_txt: boolean;
  has_sitemap: boolean;
}

export interface ExtractedSignals {
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  h1_count: number;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  whatsapp_link: string | null;
  social_links: string[];
  is_https: boolean;
  has_contact_form: boolean;
  schema_types: string[];
  has_robots_txt: boolean;
  has_sitemap: boolean;
}

export type Severity = 'high' | 'medium' | 'low';

export interface Finding {
  rule_id: string;
  label: string;
  business_impact: string;
  severity: Severity;
}

export interface OutreachEmail {
  subject: string;
  body: string;
}

export interface AIIntelligence {
  executive_summary: string;
  strengths: string[];
  opportunities: string[];
  discovery_questions: string[];
  email: OutreachEmail;
  whatsapp: string;
  call_brief: string;
}

export interface Lead {
  schema_version: '1.0';
  domain: string;
  company_name: string;
  processed_at: string;
  signals: ExtractedSignals;
  findings: Finding[];
  opportunity_score: number;
  intelligence: AIIntelligence;
}

export interface ProcessingJob {
  job_id: string;
  created_at: string;
  total: number;
  completed: number;
  failed: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  leads: Array<{
    domain: string;
    company_name: string;
    original_url: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    error?: string;
    apify_meta?: ApifyMeta;
  }>;
}
