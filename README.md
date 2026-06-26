# Opti-Core

**The intelligence engine powering AI-driven business analysis, competitive research, and automated outreach.**

Opti-Core is a TypeScript monorepo that ingests raw business signals — web crawls, structured data feeds, and third-party sources — runs them through a layered AI analysis pipeline, and surfaces actionable intelligence as structured reports and automated outreach sequences.

It is built to run as a headless engine: apps consume its packages via well-typed APIs; the engine itself has no opinion about UI frameworks or delivery channels.

---

## What It Does

| Stage | Package | Responsibility |
|-------|---------|----------------|
| Ingest | `packages/crawler` | Crawls target URLs, respects robots.txt, handles rate limits and retries |
| Parse | `packages/parser` | Extracts structured signals from raw HTML and document formats |
| Analyse | `packages/analyzer` | Runs signal extraction, scoring, and trend detection |
| Reason | `packages/ai` | Provider-agnostic LLM abstraction for summaries, classification, and generation |
| Govern | `packages/rules` | Declarative rules engine that applies business logic to analysis output |
| Store | `packages/database` | Supabase client, typed schema, and migration helpers |
| Report | `packages/reports` | Renders structured intelligence into deliverable report formats |
| Act | `packages/outreach` | Sequences and dispatches personalised outreach based on analysis output |
| Foundation | `packages/shared` | Types, constants, error classes, and utilities shared across all packages |

---

## Repository Layout

```
opti-core/
├── apps/                     # Deployable applications (dashboard, API server, workers)
├── packages/
│   ├── ai/                   # LLM provider abstraction layer
│   ├── analyzer/             # Signal analysis and scoring engine
│   ├── crawler/              # Web crawling and data ingestion
│   ├── database/             # Supabase client and schema types
│   ├── outreach/             # Outreach sequencing and dispatch
│   ├── parser/               # HTML and document parsing
│   ├── reports/              # Report generation and rendering
│   ├── rules/                # Declarative business rules engine
│   └── shared/               # Shared types, utilities, and constants
├── docs/
│   ├── api/                  # API reference
│   ├── architecture/         # Detailed architecture diagrams and notes
│   ├── decisions/            # Architecture Decision Records (ADRs)
│   ├── product/              # Product context, personas, user stories
│   └── prompts/              # LLM prompt library and versioning
├── scripts/                  # Operational scripts (migrations, seeding, CI helpers)
├── supabase/                 # Supabase project config, migrations, and seed data
├── tests/                    # Cross-package integration and end-to-end tests
├── ARCHITECTURE.md           # System architecture reference
├── CHANGELOG.md              # Version history
├── CLAUDE.md                 # AI assistant rules and context
├── DECISIONS.md              # Architecture decision log
└── TASKS.md                  # Engineering task tracking
```

---

## Technology Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Language | TypeScript 5.x | Type safety at the boundary of every package |
| Monorepo | Turborepo | Incremental builds, remote caching, task orchestration |
| Database | Supabase (PostgreSQL) | Managed Postgres, real-time, row-level security, edge functions |
| AI Layer | Abstracted (Claude-first) | Swap providers without touching consumer code |
| Runtime | Node.js 20 LTS | Stable, long-term support, native ESM |
| Testing | Vitest | Fast, ESM-native, compatible with Turborepo task graph |
| Package Manager | pnpm | Strict dependency resolution, efficient disk usage |

---

## Getting Started

### Prerequisites

- Node.js 20 LTS or later
- pnpm 9 or later
- A Supabase project (see `supabase/`)
- API keys for your chosen LLM provider

### Environment

Copy `.env.example` to `.env` and fill in all required values. Every package reads from the root `.env` via the shared config in `packages/shared`.

```bash
cp .env.example .env
```

### Install

```bash
pnpm install
```

### Build all packages

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Type-check

```bash
pnpm typecheck
```

---

## Development Workflow

See `TASKS.md` for the task management process.
See `ARCHITECTURE.md` for design decisions and package contracts.
See `DECISIONS.md` for the architecture decision log.
See `CHANGELOG.md` for version history.

Branch from `main`. Name branches `feat/`, `fix/`, `chore/`, or `docs/`. Open a pull request with a description that references the relevant task. All checks must pass before merge.

---

## Versioning

Opti-Core follows [Semantic Versioning](https://semver.org/). Each package is versioned independently. The root `CHANGELOG.md` tracks platform-level releases. Package-level changelogs live alongside each package.

---

## Licence

Proprietary. All rights reserved.
