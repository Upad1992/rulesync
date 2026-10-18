# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## What this project is

`rulesync` is a Node.js CLI that keeps AI coding tool configs in sync. It reads a single source of truth in `.rulesync/` and **generates** per-tool config files (Claude Code, Cursor, Copilot, Codex, …), and **imports** existing tool configs back into `.rulesync/`.

Toolchain: ESM + TypeScript, `pnpm` (≥10), Node (≥22), runtimes managed by `mise` (`mise.toml`). Lint/format are `oxlint` + `oxfmt`; typecheck is `tsgo`; tests are `vitest`; build is `tsdown`.

## Common commands

```bash
pnpm i                      # install
pnpm cicheck                # the gate: code checks + content checks. Run before committing.
pnpm cicheck:code           # fmt:check + oxlint + typecheck + unit tests
pnpm cicheck:content        # skill-docs sync, docs-content, gitignore, tables, cspell, secretlint

pnpm build                  # tsdown -> dist/
pnpm dev <cmd>              # run CLI from source, e.g. `pnpm dev generate -t claudecode -f "*"`

pnpm test                   # unit tests (vitest run)
pnpm test:watch
pnpm test:e2e               # e2e specs (separate config)
pnpm test:coverage

pnpm check                  # oxfmt --check + oxlint + tsgo --noEmit
pnpm fix                    # oxfmt . + oxlint --fix
pnpm knip                   # unused exports/files/deps
```

Single test file:

```bash
pnpm vitest run src/features/rules/claudecode-rule.test.ts
pnpm vitest run -t "describe or test name"        # filter by name
pnpm vitest run --config vitest.e2e.config.ts src/e2e/e2e-rules.spec.ts
```

Manual smoke of the two directions:

```bash
pnpm dev generate --targets "*" --features "*"
pnpm dev import -t claudecode -f "*"
```

## Architecture: the big picture

The codebase is shaped by one axis cross: **feature** × **tool**.

- **Feature** — the kind of config: `rules`, `ignore`, `mcp`, `commands`, `subagents`, `skills`, `hooks`, `permissions`, `checks`.
- **Tool** — the target CLI/IDE (`claudecode`, `cursor`, `copilot`, …). Tool identifiers live in `src/types/tool-target-tuples.ts` as per-feature tuples; `ALL_TOOL_TARGETS` is their union (`src/types/tool-targets.ts`). That file deliberately has zero imports to avoid cycles.

### Layering

| Layer | Path | Role |
| --- | --- | --- |
| CLI wiring | `src/cli/` | `index.ts` → `program.ts` registers every subcommand with Commander. Each `.action()` is wrapped in `wrapCommand(...)` (`src/cli/wrap-command.ts`) for Logger + error-code → exit-code mapping. Thin adapters only. |
| Command adapters | `src/cli/commands/` | One file per command (`generate.ts`, `import.ts`, `gitignore.ts`, …): option parsing, logging, JSON summary. |
| Business logic | `src/lib/` | The real work, CLI-independent and programmatically callable: `generate.ts`, `import.ts`, `convert.ts`, `init.ts`, `watch.ts`, plus `orphan-sweep.ts`, `retire-targets.ts`, and GitHub/npm/APM clients. |
| Feature implementations | `src/features/` | `<feature>/<tool>-<feature>.ts` (e.g. `rules/claudecode-rule.ts`), one class per tool. Plus `<feature>/<feature>-processor.ts` and `features/shared/` for cross-tool config gateways. |
| Base abstractions | `src/types/` | `RulesyncFile` (source side), `ToolFile` (target side), `AiFile`/`AiDir`, `FeatureProcessor`, `DirFeatureProcessor`. |
| Paths | `src/constants/` | One `<tool>-paths.ts` per tool. Always use these constants and `join` from `node:path` instead of hardcoding paths. |
| Generated | `src/generated/` | Auto-generated. Never edit by hand. |
| MCP server | `src/mcp/` | Exposes rulesync itself as an MCP server. |

### The processor/factory pattern (the key to adding anything)

Every feature has a processor that holds a **factory map** keyed by tool target, e.g. `toolRuleFactories` at `src/features/rules/rules-processor.ts:454`. Each entry is `{ class: ClaudecodeRule, meta: { extension, supportsGlobal, ruleDiscoveryMode, collisionPolicy, … } }`. The processor dispatches on `meta`, so a tool's behavior is mostly declarative.

`PROCESSOR_REGISTRY` at `src/types/processor-registry.ts:69` binds each feature to `{ processor, schema, factory }`. It is read by the tool-target tests, the gitignore derivation, and the supported-tools table generator — add a feature there and the rest follows.

### Data flow

**generate**: `cli/commands/generate.ts` → `ConfigResolver.resolve` (merges `rulesync.jsonc` + CLI flags) → `generate()` at `src/lib/generate.ts:897` → per-feature `generateXxxCore` → `new XxxProcessor(...)` → `loadRulesyncFiles()` → `convertRulesyncFilesToToolFiles()` → `writeAiFiles()` → orphan sweep. Feature order comes from `resolveExecutionOrder`; features that both write the same shared file must declare `dependsOn` or generation fails fast.

**import** is the mirror: `src/lib/import.ts` → per-feature `importXxxCore` → `processor.loadToolFiles()` → `convertToolFilesToRulesyncFiles()` → write back into `.rulesync/`.

**convert** is import→generate piped, without persisting `.rulesync/`.

### Subcommands

Registered in `src/cli/program.ts`: `init`, `gitignore`, `add <source>`, `fetch <source>`, `import`, `convert`, `mcp`, `install`, `generate` (`:281`), `doctor`, `docs [document]`, `release-notes <source>`, `update`.

## Generated artifacts — regenerate or CI fails

Several files are produced by scripts and then verified with `git diff --exit-code`. **If you change source that feeds them, re-run the generator before committing.**

| Change you made | Run this |
| --- | --- |
| Anything affecting tool/feature support | `pnpm run generate:tables` → rewrites `README.md` + `docs/reference/supported-tools.md` |
| `docs/**/*.md` | `pnpm run generate:docs-content` → rewrites `src/generated/docs-content.ts` (also done by lint-staged) |
| Paths / `getSettablePaths` | `pnpm dev gitignore` → rewrites `.gitignore` + `.gitattributes` |
| `.rulesync/**/*` | `pnpm dev generate` (lint-staged does this automatically) |
| Skill docs | `pnpm run check:sync-skill-docs` verifies `skills/rulesync/` |

Do **not** hand-edit: the support matrix in `README.md`/`docs/reference/supported-tools.md`, `src/generated/**`, or derived `.gitignore` sections. Add exceptional gitignore paths to `HAND_MAINTAINED_GITIGNORE_ENTRIES` in `src/cli/commands/gitignore-entries.ts` instead.

## Testing conventions

- Test files are **co-located** with implementation: `src/a.ts` → `src/a.test.ts`.
- Unit tests: `src/**/*.test.ts` + `scripts/**/*.test.ts` (`vitest.config.ts`). E2E: `src/e2e/**/*.spec.ts` (`vitest.e2e.config.ts`, serial, 60s timeout).
- Never touch real dirs. Use `setupTestDirectory()` from `src/test-utils/test-directories.ts` (yields `./tmp/tests/projects|home/{random}`) and **mock `process.cwd()`** — do not call `process.chdir()` in unit tests (global side effects). E2E may `chdir`.
- For global/home-scope tests use `setupTestDirectory({ home: true })` and mock `getHomeDirectory()`; E2E uses the `HOME_DIR` env var.
- Under `NODE_ENV=test`, `Logger` output is suppressed (use `console.log` + `--silent=false` to debug) and `getHomeDirectory()` throws unless `HOME_DIR` is set.
- Keep end-to-end happy-path coverage for every Tool × Feature combination that exists.

## Coding conventions (project's own rules, in `.rulesync/rules/`)

- kebab-case file names, even for class files.
- Multiple arguments → pass a single object. Same for constructors.
- Static imports only; no dynamic imports.
- **No barrel files** — import implementation files directly (the maintainer considers barrels harmful to tree-shaking and import transparency).
- Validate with `zod/mini`; use `z.looseObject()` for frontmatter schemas (tools keep adding keys).
- Paths: `join` from `node:path` for filesystem paths; `path.posix.join` / `toPosixPath` for non-filesystem paths (API paths, gitignore entries, generated content).
- `outputRoot` defaults to `process.cwd()`; `relativeDirPath` defaults to `"."`.
- Format errors with `formatError` from `src/utils/error.ts`.
- Prefer `rg` over `grep`, `fd` over `find`.

## Repo-specific gotchas

- **This repo manages itself with rulesync.** `.rulesync/` holds the project's own rules, skills, subagents, `hooks.json`, `mcp.json`, `permissions.jsonc`. Editing `.rulesync/**` triggers regeneration.
- **Root `skills/` ≠ `.rulesync/skills/`.** Root `skills/` is what ships to users via `rulesync fetch dyoshikawa/rulesync`; don't modify it unless you intend to change the distributed skills.
- `.rulesyncignore` is rulesync's own ignore-feature source (currently `.env*`); it is unrelated to `.gitignore`.
- `rulesync.jsonc` is the project config; `rulesync.local.jsonc` is the gitignored personal override.
- The repo is indexed by CodeGraph (`.codegraph/` exists). Prefer `codegraph_explore` (MCP) or `codegraph explore "<symbols or question>"` over grep/find when locating or understanding code.

## PR / CI expectations

- `pnpm cicheck` before committing. Never `--no-verify`.
- External contributors: PRs should stay ≤ ~400 added lines (hard limit 1,000, `MAX_ADDITIONS` in `.github/workflows/pr-policy.yml:37`) and at most 2 open PRs (`MAX_OPEN_PRS`, `:38`). PRs inactive for 14 days are auto-closed (`auto-close-stale-prs.yml:25`).
- CI (`ci.yml`) runs install → `pnpm cicheck` → `pnpm build`, checking `git status --porcelain` is clean after both install and build, and asserts `dist/index.{js,cjs,d.ts,d.cts}` exist.
- Associate each PR with its issue via a link in the description.
