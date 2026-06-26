# Architecture

This document is the authoritative reference for Opti-Core's technical architecture. It describes system structure, package contracts, data flow, and the principles that govern all engineering decisions. It is a living document — update it when architecture changes, not after.

---

## 1. Guiding Principles

### 1.1 The Engine is Headless

Opti-Core is a computation engine, not an application. It exposes typed TypeScript APIs. Apps in `apps/` consume those APIs. The engine has no knowledge of HTTP, WebSockets, or UI rendering — those concerns belong to the application layer.

### 1.2 Packages are Contracts

Each package in `packages/` is a bounded context with a public API surface defined by its `index.ts` barrel export. Packages must not import from sibling packages except through their public API. Internal implementation is private. This enforces loose coupling and enables independent testing.

### 1.3 Data Flows One Direction

```
Ingest → Parse → Analyse → Govern → Report / Act
```

No package downstream in this pipeline imports from a package upstream of it. The pipeline is orchestrated by a coordinator (in `apps/`) that calls each stage in sequence, passing typed results between them. This prevents circular dependencies and makes the pipeline composable.

### 1.4 AI is an Implementation Detail

The `packages/ai` layer is the only place in the codebase that knows which LLM provider is active. All other packages call `packages/ai` via a stable interface. Switching from Claude to GPT-4o, or adding a fallback provider, requires changing one file — the provider adapter in `packages/ai`.

### 1.5 Rules are Data, Not Code

Business logic that changes frequently — scoring weights, inclusion/exclusion criteria, outreach triggers — lives in `packages/rules` as declarative rule definitions, not as scattered conditionals across the codebase. Rules are versioned, testable in isolation, and can be updated without touching pipeline code.

### 1.6 The Database is One Source of Truth

All persistent state lives in Supabase. Packages that need to read or write data import `packages/database`. No package constructs raw SQL or manages its own connection pool. Schema migrations are managed in `supabase/migrations` and applied through the Supabase CLI.

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           apps/ (consumers)                          │
│   dashboard  │  api-server  │  worker  │  cli                        │
└──────┬───────┴──────┬───────┴────┬─────┴────┬──────────────────────┘
       │               │            │           │
       ▼               ▼            ▼           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Pipeline Packages                            │
│                                                                      │
│   ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────────┐  │
│   │ crawler  │──▶│  parser  │──▶│  analyzer  │──▶│    rules     │  │
│   └──────────┘   └──────────┘   └────────────┘   └──────┬───────┘  │
│                                                          │           │
│                                              ┌───────────┴──────┐   │
│                                              │                  │   │
│                                         ┌───▼──────┐   ┌───────▼─┐ │
│                                         │ reports  │   │outreach │ │
│                                         └──────────┘   └─────────┘ │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ all packages consume
       ┌───────────────────────────┼────────────────────────┐
       │                           │                        │
  ┌────▼──────┐             ┌──────▼──────┐         ┌──────▼──────┐
  │    ai     │             │  database   │         │   shared    │
  └───────────┘             └─────────────┘         └─────────────┘
```

---

## 3. Package Contracts

### 3.1 `packages/shared`

**Purpose:** Zero-dependency foundation for every other package.

**Exports:**
- TypeScript types and interfaces used across the pipeline
- Error base classes (`OptiError`, `ValidationError`, `ProviderError`)
- Constants (rate limits, scoring bands, status enums)
- Utility functions (date helpers, slug generation, safe JSON parsing)

**Rules:**
- Must have zero runtime dependencies outside of Node.js built-ins.
- Must not import from any other `packages/*` package.
- All types exported here are the canonical shape for inter-package data.

---

### 3.2 `packages/database`

**Purpose:** Single access point for all Supabase operations.

**Exports:**
- A typed Supabase client factory
- Repository functions for each domain entity (companies, signals, reports, jobs)
- TypeScript types generated from the Supabase schema
- Migration helper utilities

**Rules:**
- All database access across the entire codebase goes through this package.
- Row-level security is enforced at the database level; packages must not implement their own access control.
- Connection configuration is read from `packages/shared` environment utilities.

---

### 3.3 `packages/crawler`

**Purpose:** Fetches raw content from target URLs.

**Exports:**
- `crawl(targets: CrawlTarget[]): Promise<CrawlResult[]>`
- `CrawlTarget`, `CrawlResult`, `CrawlOptions` types

**Behaviour:**
- Respects `robots.txt` and `Crawl-Delay` headers.
- Implements exponential backoff on HTTP 429 and 5xx responses.
- Returns raw HTML, HTTP status, response headers, and crawl metadata.
- Does not parse, analyse, or store results — those are downstream concerns.

---

### 3.4 `packages/parser`

**Purpose:** Extracts structured signals from raw crawl output.

**Exports:**
- `parse(result: CrawlResult, options?: ParseOptions): Promise<ParsedDocument>`
- `ParsedDocument`, `ExtractedSignal`, `ParseOptions` types

**Extracts:**
- Title, meta description, canonical URL, Open Graph data
- Headings hierarchy (H1–H3)
- Body text (cleaned, de-boilerplated)
- Structured data (JSON-LD, microdata)
- Internal and external links
- Page performance hints (resource counts, script density)

**Rules:**
- Produces deterministic output for the same input — no AI calls here.
- Must handle malformed HTML gracefully without throwing.

---

### 3.5 `packages/ai`

**Purpose:** Provider-agnostic interface to large language models.

**Exports:**
- `createAIClient(config: AIConfig): AIClient`
- `AIClient` interface with methods: `complete`, `embed`, `classify`, `summarise`
- `AIConfig`, `AIResponse`, `AIError` types

**Provider adapters (internal):**
- `adapters/gemini.ts` — Google Gemini Flash (default, see ADR-006)
- `adapters/claude.ts` — Anthropic Claude
- `adapters/openai.ts` — OpenAI GPT-4 series

**Rules:**
- All prompt templates live in `docs/prompts/` with version identifiers.
- The active adapter is selected by environment variable at runtime.
- Retry logic, token counting, and cost tracking are implemented inside this package.
- No other package imports `@anthropic-ai/sdk` or `openai` directly.

---

### 3.6 `packages/analyzer`

**Purpose:** Derives scored intelligence from parsed documents using AI and heuristics.

**Exports:**
- `analyse(doc: ParsedDocument, context: AnalysisContext): Promise<AnalysisResult>`
- `AnalysisResult`, `SignalScore`, `AnalysisContext` types

**Produces:**
- AI visibility score (0–100)
- Content quality score (0–100)
- Technical health signals (schema presence, crawlability, performance)
- Competitive positioning signals
- Trend deltas when prior analysis exists

**Rules:**
- Uses `packages/ai` for LLM-dependent scoring.
- Uses heuristic scoring for deterministic signals (schema presence, H1 count, etc.).
- Calls `packages/database` to retrieve prior analysis for delta calculation.

---

### 3.7 `packages/rules`

**Purpose:** Applies declarative business rules to analysis output to produce actionable decisions.

**Exports:**
- `evaluate(result: AnalysisResult, ruleset: Ruleset): RuleEvaluation`
- `Ruleset`, `Rule`, `RuleEvaluation`, `RuleAction` types
- Built-in rulesets: `DEFAULT_AUDIT_RULES`, `OUTREACH_TRIGGER_RULES`

**Rule structure:**
```
Rule {
  id: string          // e.g. "ai-visibility-low"
  condition: Condition
  action: RuleAction  // e.g. { type: "flag", severity: "high", label: "Low AI visibility" }
  priority: number
}
```

**Rules:**
- Rules are pure functions — given the same input they produce the same output.
- No database calls, no AI calls, no side effects.
- New rulesets are added as named exports alongside existing rulesets.

---

### 3.8 `packages/reports`

**Purpose:** Renders analysis and rule evaluations into structured, deliverable report formats.

**Exports:**
- `generateReport(input: ReportInput, template: ReportTemplate): Promise<Report>`
- `Report`, `ReportInput`, `ReportTemplate`, `ReportFormat` types
- Built-in templates: `AUDIT_REPORT`, `COMPETITIVE_SUMMARY`, `MONTHLY_DIGEST`

**Output formats:**
- JSON (canonical — always produced)
- Markdown (human-readable summary)
- HTML (styled, embeddable in email or dashboard)

**Rules:**
- No AI calls for layout or structure — templates are deterministic.
- AI calls are permitted for narrative generation (summary paragraphs) via `packages/ai`.
- Generated reports are persisted via `packages/database`.

---

### 3.9 `packages/outreach`

**Purpose:** Sequences and dispatches personalised outreach based on rule evaluation output.

**Exports:**
- `enqueue(target: OutreachTarget, sequence: OutreachSequence): Promise<OutreachJob>`
- `dispatch(job: OutreachJob): Promise<DispatchResult>`
- `OutreachTarget`, `OutreachSequence`, `OutreachJob`, `DispatchResult` types

**Behaviour:**
- Outreach is only triggered when `packages/rules` produces an action of type `"outreach"`.
- Message content is generated by `packages/ai` using prompt templates from `docs/prompts/`.
- All jobs are persisted to `packages/database` before dispatch — dispatch is idempotent.
- Respects per-target send limits and global rate limits.

---

## 4. Data Model (Summary)

The canonical entities in the system are:

| Entity | Description |
|--------|-------------|
| `Company` | A business being analysed — name, domain, metadata |
| `CrawlJob` | A scheduled or ad-hoc crawl task for a company |
| `CrawlResult` | Raw output of a single crawl (HTML, headers, status) |
| `ParsedDocument` | Structured signals extracted from a CrawlResult |
| `AnalysisResult` | Scored intelligence derived from a ParsedDocument |
| `RuleEvaluation` | Output of the rules engine for a given AnalysisResult |
| `Report` | A rendered, deliverable intelligence document |
| `OutreachJob` | A queued outreach action with target, sequence, and status |

Full schema definitions are in `supabase/migrations`.

---

## 5. Observability

Every package emits structured log events using a logger from `packages/shared`. Log events include:

- `package` — the emitting package name
- `operation` — the function or action name
- `duration_ms` — execution time
- `status` — `success` | `error` | `skipped`
- `error` — serialised error detail when status is `error`

No package uses `console.log` directly. All output goes through the shared logger so it can be routed to a log aggregator in production without code changes.

---

## 6. Error Handling Strategy

All errors extend `OptiError` from `packages/shared`. Errors carry:

- `code` — a stable machine-readable string (e.g. `CRAWLER_TIMEOUT`)
- `message` — a human-readable description
- `context` — structured metadata relevant to the error
- `retryable` — boolean indicating whether the operation should be retried

The pipeline coordinator in `apps/` is responsible for retry decisions. Packages surface errors; they do not implement retry loops.

---

## 7. Security Considerations

- All secrets are read from environment variables. No secrets in source.
- Database access is mediated by Supabase row-level security policies.
- Outbound HTTP requests (crawler) are made from a fixed egress IP range.
- LLM prompts must not be constructed using unsanitised user input.
- All inter-package boundaries validate input with runtime type checks before processing.

---

## 9. MVP Application Architecture

> This section describes Sprint 1. The MVP is a single-user internal tool with no authentication, no billing, and no multi-tenancy.

### 9.1 User Workflow

```
CSV Upload → Validate → Normalize URLs → Crawl websites → Extract signals
     → Run rule engine → Call Gemini Flash → Generate BI → Generate outreach
     → Save lead.json → Display Lead Detail → Copy outreach
```

### 9.2 Core Modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| Config | `packages/shared/src/config.ts` | Read and validate env vars at startup |
| Logger | `packages/shared/src/logger.ts` | Structured logging via pino |
| Shared Types | `packages/shared/src/types.ts` | Canonical `Lead`, `Finding`, `Outreach` types |
| CSV Import | `packages/shared/src/csv.ts` | Parse, validate, normalize URLs |
| Crawler | `packages/crawler` | Fetch raw HTML, handle errors gracefully |
| HTML Parser | `packages/parser` | Deterministic signal extraction |
| Rule Engine | `packages/rules` | Produce structured findings from signals |
| AI Engine | `packages/ai` | Gemini Flash calls, JSON schema enforcement |
| Report Generator | `packages/reports` | Build business intelligence structure |
| Outreach Generator | `packages/outreach` | Generate email, WhatsApp, call brief |
| Storage Layer | `apps/mvp/src/lib/storage.ts` | Read/write `lead.json` files |

### 9.3 Deterministic Signal Extraction

The HTML parser extracts these signals without AI:

- Page title
- Meta description
- H1 (present / missing / multiple)
- Contact details (phone, email, address)
- Social links (WhatsApp, LinkedIn, Instagram, Facebook)
- HTTPS status
- Forms (contact / lead capture present)
- Navigation structure
- Structured data (JSON-LD schema types)
- `robots.txt` (accessible, disallow rules)
- `sitemap.xml` (present / missing)

Output: structured JSON passed to the rule engine.

### 9.4 Rule Engine Findings

The rule engine evaluates extracted signals and produces typed findings. Rules do not call AI. Examples:

| Rule ID | Condition | Finding |
|---------|-----------|---------|
| `missing-cta` | No contact form and no phone number visible | Weak call-to-action |
| `weak-trust` | No testimonials schema, no case studies link | Low trust signals |
| `no-portfolio` | No gallery, no project links | Cannot demonstrate capability |
| `weak-messaging` | H1 is generic or missing | Unclear value proposition |
| `poor-contactability` | No phone, no WhatsApp, no contact form | Hard to reach |
| `missing-whatsapp` | No WhatsApp link detected | Missing preferred channel |
| `no-schema` | No JSON-LD schema detected | Poor structured data |

### 9.5 AI Responsibilities (Gemini Flash)

Receives structured JSON (findings + signals). Never receives raw HTML.

Returns validated JSON conforming to this structure:

```typescript
{
  executive_summary: string;       // 2–3 sentences, business language
  strengths: string[];             // What they are doing well
  opportunities: Finding[];        // Prioritized by revenue impact
  discovery_questions: string[];   // 3 questions for the sales call
  email: OutreachMessage;          // Subject + body
  whatsapp: string;                // 2–3 line message
  call_brief: string;              // One-paragraph briefing
}
```

### 9.6 Storage Schema (`lead.json`)

```typescript
{
  schema_version: '1.0';
  domain: string;
  company_name: string;
  processed_at: string;            // ISO 8601
  signals: ExtractedSignals;       // Raw deterministic extraction
  findings: Finding[];             // Rule engine output
  opportunity_score: number;       // 0–100, calculated deterministically
  intelligence: AIIntelligence;    // Gemini Flash output
}
```

File path: `data/leads/{domain}.lead.json`

### 9.7 UI Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Home | `/` | List all processed leads, ordered by opportunity score |
| Upload | `/upload` | CSV file input, validation feedback, trigger processing |
| Processing | `/processing` | Real-time progress per lead during batch run |
| Lead Detail | `/leads/[domain]` | Score, summary, findings, email, WhatsApp, call brief, copy buttons |

### 9.8 MVP Constraints

- Single user. No authentication.
- No billing, no multi-tenancy, no team features.
- No email sending. No WhatsApp API dispatch.
- No external CRM integration.
- Storage is file-based (`data/leads/`). Supabase not used in Sprint 1.
- If a feature does not directly support the workflow above, it goes to the backlog.

---

## 8. Evolving This Document

When a significant architectural decision is made:

1. Record it in `DECISIONS.md` as a new ADR entry.
2. Update the relevant section of this document to reflect the new state.
3. If a package contract changes, update section 3 for that package.
4. Commit both files together so the decision and its effect are traceable in one commit.
