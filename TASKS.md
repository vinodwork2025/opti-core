# Task Management

This file defines the task management process for Opti-Core and tracks the current engineering backlog. It is the working record of what has been done, what is in progress, and what comes next.

---

## Process

### Task Lifecycle

```
Backlog → In Progress → Review → Done
```

- **Backlog** — Defined and prioritised, not yet started.
- **In Progress** — Actively being worked. One engineer owns it. A branch is open.
- **Review** — Pull request open, awaiting approval. No new work starts on this task.
- **Done** — Merged to `main`. Changelog updated if the change affects external behaviour.

### Rules

- One task per branch. Branch name matches the task ID: `feat/T-001`, `fix/T-012`, `docs/T-008`.
- No task moves to In Progress without a clear acceptance criteria.
- No task is marked Done until tests pass and the PR is merged.
- If a task grows beyond one pull request, split it into sub-tasks.

---

## Commit Convention

All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New capability added to a package or app |
| `fix` | Bug correction |
| `docs` | Documentation only |
| `chore` | Build scripts, config, tooling — no production logic |
| `refactor` | Code restructured without changing behaviour |
| `test` | Tests added or corrected |
| `perf` | Performance improvement |
| `ci` | Changes to CI/CD pipeline |

**Scope** is the package or app name: `crawler`, `parser`, `ai`, `database`, `analyzer`, `rules`, `reports`, `outreach`, `shared`, `root`.

**Examples:**

```
feat(crawler): add exponential backoff on 429 responses
fix(parser): handle malformed JSON-LD without throwing
docs(architecture): update ADR-003 with provider cost notes
chore(root): add typecheck to turbo pipeline
test(rules): add coverage for outreach trigger conditions
```

Breaking changes are indicated by `!` after the type and a `BREAKING CHANGE:` footer:

```
feat(database)!: rename companies table to accounts

BREAKING CHANGE: The `companies` table has been renamed to `accounts`.
Run migration 0003 before deploying this version.
```

---

## Branch Strategy

| Branch | Purpose | Protected |
|--------|---------|-----------|
| `main` | Stable, deployable, always passing | Yes — requires PR + passing CI |
| `feat/*` | New features | No |
| `fix/*` | Bug fixes | No |
| `chore/*` | Tooling, config, CI | No |
| `docs/*` | Documentation only | No |
| `release/*` | Release preparation | Yes — created by release process |

**Rules:**
- Direct commits to `main` are not permitted.
- Every PR targets `main` unless it is a hotfix branching from a release tag.
- Branch names are lowercase with hyphens: `feat/crawler-retry-logic`, not `feat/CrawlerRetryLogic`.
- Delete branches after merge.

---

## Pull Request Standards

Every PR must include:

1. **Title** — A conventional commit summary (same format as a commit message).
2. **Description** — What changed and why. Link to the relevant task ID.
3. **Testing** — What was tested and how. For non-trivial changes, list the test cases.
4. **Checklist:**
   - [ ] Types are correct — no `any`, no unchecked `unknown`
   - [ ] Tests written or updated
   - [ ] `pnpm build` passes
   - [ ] `pnpm test` passes
   - [ ] `pnpm typecheck` passes
   - [ ] `CHANGELOG.md` updated if the change affects external behaviour
   - [ ] `ARCHITECTURE.md` updated if a package contract changed
   - [ ] `DECISIONS.md` updated if a significant decision was made

---

## Engineering Backlog

### Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Backlog |
| `[~]` | In Progress |
| `[x]` | Done |
| `[!]` | Blocked |

---

### Phase 0 — Foundation

| ID | Task | Status | Owner |
|----|------|--------|-------|
| T-001 | Initialise repository structure and root documentation | [x] | Architect |
| T-002 | Configure `turbo.json` task graph (build, test, typecheck, lint) | [ ] | — |
| T-003 | Configure root `tsconfig.json` with path aliases for all packages | [ ] | — |
| T-004 | Configure `pnpm-workspace.yaml` | [ ] | — |
| T-005 | Add `.gitignore` with Node, pnpm, env, and OS entries | [ ] | — |
| T-006 | Add `.env.example` with all required environment variable keys | [ ] | — |
| T-007 | Configure ESLint and Prettier with shared config in `packages/shared` | [ ] | — |
| T-008 | Add GitHub Actions CI workflow: install, build, typecheck, test | [ ] | — |

---

### Phase 1 — Shared Foundation Package

| ID | Task | Status | Owner |
|----|------|--------|-------|
| T-010 | Scaffold `packages/shared` with `package.json` and `tsconfig.json` | [ ] | — |
| T-011 | Define core TypeScript types: `Company`, `CrawlTarget`, `CrawlResult`, `ParsedDocument`, `AnalysisResult`, `Report`, `OutreachJob` | [ ] | — |
| T-012 | Implement `OptiError` base class with `code`, `message`, `context`, `retryable` | [ ] | — |
| T-013 | Implement structured logger using `pino` | [ ] | — |
| T-014 | Implement environment config reader with runtime validation | [ ] | — |
| T-015 | Implement utility functions: `chunks`, `slugify`, `safeJsonParse`, `sleep`, `retry` | [ ] | — |
| T-016 | Write unit tests for all `packages/shared` exports | [ ] | — |

---

### Phase 2 — Database Package

| ID | Task | Status | Owner |
|----|------|--------|-------|
| T-020 | Scaffold `packages/database` with `package.json` and `tsconfig.json` | [ ] | — |
| T-021 | Initialise Supabase project and create `supabase/config.toml` | [ ] | — |
| T-022 | Write migration 0001: `companies`, `crawl_jobs`, `crawl_results` tables | [ ] | — |
| T-023 | Write migration 0002: `analysis_results`, `rule_evaluations` tables | [ ] | — |
| T-024 | Write migration 0003: `reports`, `outreach_jobs` tables | [ ] | — |
| T-025 | Apply RLS policies to all tables | [ ] | — |
| T-026 | Generate TypeScript types from schema | [ ] | — |
| T-027 | Implement typed repository functions for all entities | [ ] | — |
| T-028 | Write integration tests for database package against local Supabase | [ ] | — |

---

### Phase 3 — AI Package

| ID | Task | Status | Owner |
|----|------|--------|-------|
| T-030 | Scaffold `packages/ai` with `package.json` and `tsconfig.json` | [ ] | — |
| T-031 | Define `AIClient` interface and `AIConfig`, `AIResponse`, `AIError` types | [ ] | — |
| T-032 | Implement Claude adapter (`adapters/claude.ts`) | [ ] | — |
| T-033 | Implement OpenAI adapter (`adapters/openai.ts`) | [ ] | — |
| T-034 | Implement provider factory (reads `AI_PROVIDER` env var) | [ ] | — |
| T-035 | Implement token counting and cost tracking | [ ] | — |
| T-036 | Implement retry logic with exponential backoff on provider errors | [ ] | — |
| T-037 | Write unit tests with mocked provider responses | [ ] | — |
| T-038 | Document prompt engineering conventions in `docs/prompts/README.md` | [ ] | — |

---

### Phase 4 — Pipeline Packages (Crawler, Parser, Analyzer, Rules)

| ID | Task | Status | Owner |
|----|------|--------|-------|
| T-040 | Scaffold and implement `packages/crawler` core fetch logic | [ ] | — |
| T-041 | Add robots.txt parsing and respect to crawler | [ ] | — |
| T-042 | Add rate limiting and retry logic to crawler | [ ] | — |
| T-043 | Scaffold and implement `packages/parser` HTML signal extraction | [ ] | — |
| T-044 | Add JSON-LD and microdata extraction to parser | [ ] | — |
| T-045 | Scaffold and implement `packages/analyzer` scoring pipeline | [ ] | — |
| T-046 | Implement AI visibility scoring in analyzer | [ ] | — |
| T-047 | Scaffold `packages/rules` with rule type definitions | [ ] | — |
| T-048 | Implement `evaluate` function and default rulesets | [ ] | — |
| T-049 | Write unit tests for all four packages | [ ] | — |

---

### Phase 5 — Output Packages (Reports, Outreach)

| ID | Task | Status | Owner |
|----|------|--------|-------|
| T-050 | Scaffold and implement `packages/reports` with JSON and Markdown output | [ ] | — |
| T-051 | Add HTML report template | [ ] | — |
| T-052 | Scaffold and implement `packages/outreach` job queue and dispatch | [ ] | — |
| T-053 | Implement outreach message generation using `packages/ai` | [ ] | — |
| T-054 | Write tests for reports and outreach packages | [ ] | — |

---

### Phase 6 — Applications and Integration

| ID | Task | Status | Owner |
|----|------|--------|-------|
| T-060 | Design and document app architecture in `docs/architecture/` | [ ] | — |
| T-061 | Implement pipeline orchestrator in first `apps/` application | [ ] | — |
| T-062 | Add end-to-end integration tests in root `tests/` | [ ] | — |
| T-063 | Add observability: structured logging to log aggregator | [ ] | — |

---

## Completed Tasks

| ID | Task | Merged | Notes |
|----|------|--------|-------|
| T-001 | Initialise repository structure and root documentation | 2026-06-26 | Initial scaffold commit |
