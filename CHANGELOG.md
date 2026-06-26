# Changelog

All notable changes to Opti-Core are documented in this file.

This changelog follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## How to Update This File

**When to update:** Any change that affects external behaviour — new features, bug fixes, breaking changes, deprecations, and removals. Documentation-only and internal refactor commits do not require a changelog entry unless they change how a package is consumed.

**Where to add entries:** Under `[Unreleased]` during development. When a version is released, the unreleased changes become a versioned section.

**Entry format:**

```markdown
### Added
- Description of new capability. (`packages/package-name`)

### Changed
- Description of changed behaviour. Includes migration notes if needed.

### Deprecated
- Description of what is deprecated and what to use instead.

### Removed
- Description of what was removed and why.

### Fixed
- Description of the bug that was fixed.

### Security
- Description of the security issue addressed.
```

---

## [Unreleased]

### Added
- Initial repository scaffold with monorepo structure (`apps/`, `packages/`, `docs/`, `scripts/`, `supabase/`, `tests/`).
- Root documentation: `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TASKS.md`, `CHANGELOG.md`.
- Architecture Decision Records: ADR-001 (Turborepo), ADR-002 (Supabase), ADR-003 (AI abstraction), ADR-004 (rules engine), ADR-005 (stateless packages).
- Package directory stubs: `packages/ai`, `packages/analyzer`, `packages/crawler`, `packages/database`, `packages/outreach`, `packages/parser`, `packages/reports`, `packages/rules`, `packages/shared`.
- CI/CD directory stub: `.github/workflows/`.
- Claude Code settings stub: `.claude/settings.json`.

---

## Release Process

When the codebase reaches a releasable state:

1. Move all entries from `[Unreleased]` to a new versioned section: `## [X.Y.Z] — YYYY-MM-DD`.
2. Add the version comparison link at the bottom of this file.
3. Tag the release in git: `git tag v0.1.0`.
4. Push the tag: `git push origin v0.1.0`.
5. Create a GitHub release from the tag with the changelog section as the body.

### Version Increment Rules

| Change | Version bump |
|--------|-------------|
| Breaking change to a package's public API | Major (`X.0.0`) |
| New capability, backwards compatible | Minor (`0.X.0`) |
| Bug fix, backwards compatible | Patch (`0.0.X`) |
| Documentation, tooling, CI only | No version bump |

### Package-Level Versioning

Each package under `packages/` maintains its own version in its `package.json`. The root `CHANGELOG.md` tracks platform-level releases. Significant package-level changes are summarised here with the package name in parentheses.
