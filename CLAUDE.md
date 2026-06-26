# CLAUDE.md — Opti-Core AI Assistant Rules

This file governs how AI coding assistants (Claude, Copilot, or any LLM tool) must behave when working in this repository. Read it fully at the start of every session. If an instruction in this file conflicts with a user request, surface the conflict and ask — do not silently override either.

---

## 1. Project Identity

Opti-Core is a **headless AI Business Intelligence engine**. It is a TypeScript monorepo managed by Turborepo. It crawls, parses, analyses, and acts on business signals using a layered pipeline of independent packages. It is not a web application. It is not a script collection. It is an enterprise-grade computation engine designed for long-term evolution.

---

## 2. What You Must Read Before Touching Code

1. `ARCHITECTURE.md` — Package contracts, data flow, design principles
2. `DECISIONS.md` — Why the system is structured the way it is
3. `TASKS.md` — What is currently in progress and what is planned

If you have not read these three files, do not generate code.

---

## 3. Hard Rules — Never Break These

### 3.1 Package Boundaries

- Packages communicate only through their public API (`index.ts` barrel export).
- Internal files within a package are private. Do not import them from outside the package.
- Do not introduce circular dependencies between packages.
- `packages/shared` must remain zero-dependency. Do not add runtime imports to it.

### 3.2 AI Abstraction

- The only files that may import `@anthropic-ai/sdk`, `openai`, or any LLM provider SDK are inside `packages/ai`.
- All other packages call `packages/ai` through its exported `AIClient` interface.
- Do not hardcode model names outside of `packages/ai`. Use constants.

### 3.3 Database Access

- The only files that may import the Supabase client are inside `packages/database`.
- Do not construct raw SQL strings anywhere in the codebase.
- Do not manage database connections outside `packages/database`.

### 3.4 Pipeline Direction

Data flows: `crawler → parser → analyzer → rules → reports / outreach`.
No package downstream in this sequence may import from a package upstream of it.
The pipeline is orchestrated from `apps/` — not from within packages.

### 3.5 No Side Effects in Rules

`packages/rules` must be pure. No database calls. No AI calls. No network calls. No file system access. Given the same input it must always return the same output.

### 3.6 Errors

- All errors must extend `OptiError` from `packages/shared`.
- Errors must carry `code`, `message`, `context`, and `retryable`.
- No `console.log` anywhere. Use the shared logger from `packages/shared`.
- Packages surface errors — they do not implement retry loops.

### 3.7 Secrets

- No secrets, API keys, or credentials in source code or committed files.
- All configuration is read from environment variables.
- `.env` is in `.gitignore`. `.env.example` contains only key names, never values.

---

## 4. Coding Philosophy

### Write for the next engineer, not for the next feature

Code in this repository will be maintained by engineers who were not present when it was written. Optimise for readability and clear intent. Avoid clever one-liners that require context to understand.

### Explicit over implicit

- Prefer explicit type annotations at package boundaries over inferred types.
- Prefer named exports over default exports (exception: page components in `apps/`).
- Prefer descriptive variable names over short ones.

### Composition over inheritance

Prefer small, composable functions. Avoid deep class hierarchies. A function that does one thing and does it well is always preferable to a class that manages several concerns.

### Determinism first

Every function should produce the same output for the same input where possible. Isolate side effects (database writes, HTTP calls, AI calls) at the edges of the system, not at the centre.

### Types are documentation

TypeScript types are the primary form of API documentation. Public interfaces exported from packages must be precisely typed. Do not use `any`. Do not use `unknown` without a guard. Prefer `z.infer<typeof Schema>` from Zod for runtime-validated types at system boundaries.

---

## 5. Code Style

- 2-space indentation.
- Single quotes for strings.
- Trailing commas in multi-line objects and arrays.
- Semicolons required.
- Maximum line length: 100 characters.
- File names: `kebab-case.ts`.
- Class names: `PascalCase`.
- Functions and variables: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Boolean variables prefixed with `is`, `has`, `should`, or `can`.

---

## 6. Comments

Write comments that explain **why**, not **what**. The code shows what. Comments explain non-obvious constraints, workarounds for external limitations, and invariants that must not be violated.

Do not write:
```typescript
// Loop through results
for (const result of results) {
```

Do write:
```typescript
// Supabase batch inserts cap at 1,000 rows; chunk here to stay within that limit.
for (const chunk of chunks(results, 1000)) {
```

Delete commented-out code. Use version control for history.

---

## 7. Testing Requirements

- Every public function exported from a package must have unit tests.
- Tests live in a `__tests__/` directory within each package.
- Cross-package integration tests live in the root `tests/` directory.
- Use Vitest. Do not introduce Jest.
- Mock at the boundary of `packages/ai` and `packages/database` in unit tests — never mock internal package functions.
- Test file naming: `<subject>.test.ts`.
- Minimum coverage target: 80% statement coverage on `packages/` code.

---

## 8. What You Must Not Do

- Do not generate UI components (React, Next.js, Vue, Svelte).
- Do not install packages without explicit instruction.
- Do not modify `package.json`, `turbo.json`, or `tsconfig.json` without explicit instruction.
- Do not change database schema without a corresponding migration file in `supabase/migrations/`.
- Do not refactor code outside the scope of the current task.
- Do not add dependencies that duplicate existing ones (e.g. do not add `axios` if `fetch` is already in use).
- Do not use `any` type.
- Do not use `console.log`, `console.error`, or `console.warn`.
- Do not implement retry logic inside packages — that belongs in the orchestrator.
- Do not hardcode environment-specific values (URLs, keys, thresholds).

---

## 9. When to Stop and Ask

Stop and ask the user when:

- A task requires importing a new third-party package.
- A task would change the public API of a package (breaking change).
- A task would require a schema migration.
- Two reasonable approaches exist and the tradeoffs are significant.
- The task scope is unclear or contradicts a rule in this file.
- A security-sensitive area is being touched (auth, secrets, outbound HTTP, LLM prompt construction).

Do not proceed on assumption. Surface the decision, explain the options, and wait for direction.

---

## 10. Engineering Workflow Summary

1. Read `TASKS.md` to understand what is in progress.
2. Read `ARCHITECTURE.md` to understand the relevant package contract.
3. Read `DECISIONS.md` to understand constraints that are not obvious from code.
4. Make the minimum change required to complete the task.
5. Write or update tests alongside code — never after.
6. If a decision is made that future engineers need to understand, add an entry to `DECISIONS.md`.
7. Update `CHANGELOG.md` for any change that affects external behaviour.
8. Commit with a conventional commit message (see `TASKS.md` for format).
