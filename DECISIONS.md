# Architecture Decision Log

This file records significant architectural decisions made for Opti-Core. Each entry follows the Architecture Decision Record (ADR) format: context, decision, consequences, and status.

Entries are numbered sequentially and never deleted. Superseded decisions are marked as such and link to the decision that replaced them. This log is the canonical record of **why** the system is built the way it is.

---

## How to Add an Entry

When a significant technical decision is made:

1. Add a new entry at the bottom of this file.
2. Assign the next sequential number.
3. Fill in all fields — do not leave context or consequences blank.
4. Set status to `Accepted`.
5. Commit this file alongside any code that implements the decision.
6. If the decision supersedes a prior one, update the prior entry's status to `Superseded by ADR-NNN`.

---

## ADR-001: Turborepo as the Monorepo Build System

**Date:** 2026-06-26
**Status:** Accepted

**Context:**
Opti-Core is composed of nine interdependent packages and will grow to include multiple deployable apps. A build system is needed that can orchestrate tasks across packages in dependency order, cache results to avoid redundant work, and scale to a team without manual coordination of build scripts.

**Options considered:**
- Nx — Feature-rich but has a steeper learning curve and more configuration overhead.
- Lerna + Yarn Workspaces — Mature but slow incremental builds and complex versioning workflows.
- Turborepo + pnpm — Minimal configuration, fast incremental builds via content-hashing, built-in remote cache support, first-class pnpm workspace integration.

**Decision:**
Use Turborepo with pnpm workspaces. Root `turbo.json` defines the task graph. Each package defines its own build, test, and typecheck scripts. Turborepo executes them in the correct order based on the dependency graph.

**Consequences:**
- All packages must define standard scripts: `build`, `test`, `typecheck`, `lint`.
- The `turbo.json` task graph must be updated when new inter-package dependencies are introduced.
- Remote caching (Vercel Remote Cache or self-hosted) can be enabled later without changing package scripts.
- Developers run `pnpm build`, `pnpm test`, etc. from the root — Turborepo handles the rest.

---

## ADR-002: Supabase as the Database and Auth Platform

**Date:** 2026-06-26
**Status:** Accepted

**Context:**
The system needs a persistent store for companies, crawl results, analysis outputs, reports, and outreach jobs. It also needs row-level security to isolate tenant data as the platform scales to multiple customers. Managing a self-hosted PostgreSQL instance with a separate auth system would add significant operational overhead at this stage.

**Options considered:**
- Self-hosted PostgreSQL + Prisma — Full control but high operational overhead (backups, replication, connection pooling, auth).
- PlanetScale — MySQL-compatible, good branching, but no native row-level security and no real-time.
- Neon — Serverless Postgres with branching; good fit, but less mature ecosystem than Supabase.
- Supabase — Managed Postgres, built-in row-level security, real-time subscriptions, edge functions, auto-generated TypeScript types, Supabase CLI for local development.

**Decision:**
Use Supabase. The `packages/database` package wraps the Supabase client and provides the only access point to the database. Schema is managed via migrations in `supabase/migrations/`. TypeScript types are generated from the schema using `supabase gen types typescript`.

**Consequences:**
- The database schema is the source of truth for all entity types in the system.
- Generated types must be regenerated after every schema change: `pnpm --filter @opti-core/database generate:types`.
- All access control is enforced at the database layer via RLS policies — no application-level access control logic.
- Supabase project config lives in `supabase/config.toml`. Local development uses `supabase start`.

---

## ADR-003: Provider-Agnostic AI Abstraction via `packages/ai`

**Date:** 2026-06-26
**Status:** Accepted

**Context:**
The analysis and report generation pipeline makes heavy use of large language models. LLM providers change their pricing, rate limits, and capability tiers frequently. Hardcoding API calls to a specific provider throughout the codebase would create significant migration risk if a provider becomes unsuitable.

**Options considered:**
- Direct usage of Anthropic SDK throughout the codebase — simple to start, painful to migrate.
- LangChain.js abstraction layer — Adds a heavy dependency with its own abstractions and maintenance surface.
- Vercel AI SDK — Good streaming support for UI, less suited to headless batch processing.
- Custom thin adapter pattern — Minimal, owned, and easy to extend.

**Decision:**
Build a thin adapter layer in `packages/ai`. The package exports a single `AIClient` interface. Provider-specific adapters live in `packages/ai/src/adapters/`. The active adapter is selected at runtime via the `AI_PROVIDER` environment variable. The default provider is Anthropic Claude.

**Consequences:**
- No package other than `packages/ai` may import `@anthropic-ai/sdk` or `openai`.
- Adding a new provider requires creating one adapter file and registering it in the factory — no changes to consuming packages.
- Prompt templates are versioned in `docs/prompts/` and referenced by name, not inlined in code.
- Token counting, cost estimation, and retry logic are centralised in this package.

---

## ADR-004: Declarative Rules Engine in `packages/rules`

**Date:** 2026-06-26
**Status:** Accepted

**Context:**
Business logic — which signals trigger an outreach, what score threshold flags an account, which combinations of conditions constitute a high-value opportunity — changes frequently and is owned by non-engineers (product, sales). If this logic is scattered as conditionals across pipeline packages, every business logic change requires a code deployment and risks regressions.

**Options considered:**
- Inline conditionals in `packages/analyzer` — Fast to write, impossible to maintain or audit.
- External rules engine (e.g. JSON Rules Engine library) — Flexible but adds a dependency and a DSL to learn.
- JSONLogic — Portable, serialisable, but limited in expressiveness for complex conditions.
- Custom declarative rule definitions as TypeScript objects — No external dependency, fully typed, testable.

**Decision:**
Build a lightweight declarative rules engine in `packages/rules`. Rules are TypeScript objects with typed `condition` and `action` fields. The `evaluate` function processes a list of rules against an `AnalysisResult` and returns a typed `RuleEvaluation`. Rules are pure — no side effects.

**Consequences:**
- All business logic that governs pipeline behaviour lives in one place and is independently testable.
- Rules can be authored by engineers and reviewed by product without understanding the pipeline internals.
- The rules package has zero external runtime dependencies.
- Dynamic rule loading (from database) is architecturally possible but not implemented until needed.

---

## ADR-006: Google Gemini Flash as MVP AI Provider

**Date:** 2026-06-26
**Status:** Accepted — supersedes ADR-003's Claude-first default for MVP

**Context:**
The MVP processes leads in batches. Each lead triggers multiple AI calls: executive summary, strengths, opportunities, discovery questions, personalised email, WhatsApp message, and call brief. At Claude Sonnet pricing this makes batch processing expensive for an internal tool running on a founder's budget. Speed and cost-per-lead matter more than provider prestige at this stage.

**Options considered:**
- Claude Sonnet (ADR-003 default) — high quality, higher cost, Anthropic SDK already planned.
- OpenAI GPT-4o-mini — cheap, but output quality is inconsistent for structured JSON at this task size.
- Google Gemini Flash — lowest cost of the capable models, native JSON mode with schema enforcement, fast response times, good structured output quality.

**Decision:**
Use Google Gemini Flash (`gemini-1.5-flash`) as the default AI provider for MVP. The `packages/ai` adapter pattern from ADR-003 is unchanged — only the default adapter changes. A `adapters/gemini.ts` adapter will be added. Claude and OpenAI adapters remain available via the `AI_PROVIDER` environment variable.

**Consequences:**
- Add `@google/generative-ai` as the only AI SDK dependency in `packages/ai` for MVP.
- All prompts receive structured JSON input and return validated JSON against a defined schema.
- Retry once on schema validation failure before surfacing the error.
- When the platform grows and output quality becomes the constraint, switching to Claude requires changing one environment variable.

---

## ADR-007: Supabase JSONB Storage for MVP (Vercel-Compatible)

**Date:** 2026-06-26
**Status:** Accepted — supersedes file-based approach; aligns with Vercel deployment target

**Context:**
The MVP is deployed on Vercel. Vercel's serverless runtime has an ephemeral filesystem — files written during one request are not available in the next. File-based `lead.json` storage does not work. A persistent store is required. Supabase is already in the architecture (ADR-002) and the team has existing Supabase projects.

**Options considered:**
- File-based JSON — zero config, works locally only. Ruled out: incompatible with Vercel.
- Vercel KV (Redis) — integrated into Vercel dashboard, free tier. Ruled out: adds a new vendor; Supabase already planned.
- Vercel Postgres — integrated, free tier. Ruled out: same reason as KV — Supabase already chosen.
- Supabase — already in architecture, team familiarity, managed Postgres with JSONB support.

**Decision:**
Use Supabase with a minimal two-table schema:
- `leads` — `domain TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ`
- `jobs` — `job_id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ`

The `data` column stores the full `Lead` or `ProcessingJob` object as JSONB. This preserves the lead.json concept (one document per lead) while using a Vercel-compatible store. No RLS for MVP — single user, no auth.

**Consequences:**
- Supabase project required before first deployment. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Migration in `supabase/migrations/0001_leads_jobs.sql` — two `CREATE TABLE` statements.
- The `packages/database` package is not used in Sprint 1. Storage calls go directly through the Supabase JS client inside `apps/mvp/src/lib/storage.ts`.
- When multi-tenancy is needed: add `user_id` column, enable RLS — no schema redesign required.

**Processing model (Vercel constraint):**
Vercel serverless functions have a 60-second timeout. Batch processing in a single background job is not viable. Instead, the browser drives processing: it calls `/api/process` once per lead sequentially, waiting for each response before sending the next. Each call handles one full pipeline cycle (crawl → parse → rules → AI → save) and completes within the timeout. If the browser tab closes, processing stops — acceptable for a single-user internal tool.

---

## ADR-005: Flat Package Structure with No Shared State

**Date:** 2026-06-26
**Status:** Accepted

**Context:**
In complex monorepos, it is common for packages to share singleton instances (e.g. a shared logger instance, a shared database connection) via module-level globals. This creates hidden coupling between packages and makes testing difficult because state leaks between test runs.

**Decision:**
All packages are stateless by design. Instances (AI client, database client, logger) are created by the consumer (the `apps/` orchestrator) and passed into package functions as arguments. Packages do not hold module-level singleton state.

**Consequences:**
- Package functions receive their dependencies as arguments — straightforward to test by passing mock implementations.
- The orchestrator in `apps/` is responsible for initialising clients and passing them through the pipeline.
- Hot module replacement and test isolation work correctly because there is no shared state to reset.
- This means function signatures may be slightly more verbose, but the tradeoff is explicit over implicit.
