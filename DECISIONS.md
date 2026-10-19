# Decisions

<!-- cspell:ignore agentsync traecn -->

Append-only decision log for this fork. New entries get the next `D-NNN`; do not rewrite old entries.
Each entry records context, the decision, the alternatives considered, the consequences, and the evidence.
Pitfalls are collected at the end.

## D-001: Fork rulesync instead of extending the symlink aggregation repo

**Context:** Several AI coding tools are used at once (CodeBuddy, Claude Code, Trae CN, ZCode, DeepSeek Harness, CodeArts). The old aggregation repo distributes skills and rules with symlinks. Symlinks are not supported everywhere (CodeArts), subagents are barely distributed, and MCP configuration is scattered.

**Decision:** Fork rulesync and use copy-based generation as the distribution mechanism. Keep the old repo as source material, not as the runtime distribution layer.

**Alternatives:** agentsync, TeamAI, keep symlinks plus rsync.

**Consequences:** Upstream has to be tracked and merged. rulesync becomes the single generator for skills, rules, commands, MCP, and subagents.

## D-002: Trae CN differs from Trae only at user scope

**Context:** Trae CN was suspected to use a different project directory.

**Decision:** Both editions use `.trae/` at project scope. Only the user-level root differs: `~/.trae-cn/` for CN and `~/.trae/` for international. No project path changes are needed.

**Alternatives:** add a separate `traecn` target and duplicate the Trae classes.

**Consequences:** Only three source files change.

**Evidence:** `docs.trae.cn` rules/skills/commands pages; the Trae CN binary contains `projectRuleDir=".trae"`; local projects contain no `.trae-cn/` directory.

## D-003: CN-first automatic detection, no environment variable

**Context:** Both `~/.trae` and `~/.trae-cn` can exist on one machine. On this machine `~/.trae` is an empty stub.

**Decision:** For global scope, use `~/.trae-cn` when it exists, otherwise `~/.trae`.

**Alternatives:** a `TRAE_HOME` environment variable (the deepagents/hermesagent/kimi-code pattern), a per-target config option, or a new target.

**Consequences:** Zero configuration and a deterministic result per run. CN wins when both directories exist; there is no escape hatch for the international edition on such a machine. The international stub cannot mislead the check because it is not the signal.

**Evidence:** `src/utils/trae.ts`; `getHomeDirectory()` is the global root in `src/config/config-resolver.ts`.

## D-004: Global Trae support covers skills and commands only

**Context:** Trae CN also supports user-level rules (`user_rules/`) and exposes MCP only through the IDE UI.

**Decision:** Keep the change limited to skills and commands, the two features rulesync already supports globally for Trae.

**Alternatives:** add `user_rules/` generation; add user-level MCP generation.

**Consequences:** The diff stays small. User-level rules remain managed by the existing symlink; user-level MCP remains UI-managed and is not generated.

**Evidence:** `mcp-processor.ts` and `rules-processor.ts` declare `supportsGlobal: false` for Trae; `docs.trae.cn` documents no user-level `mcp.json`.

## D-005: Change `getSettablePaths`, not the shared output-root logic

**Context:** Global output is `home` plus the relative directory returned by each feature. Redirecting the tool output root would require stripping the `.trae` prefix from every feature path.

**Decision:** Let `TraeSkill.getSettablePaths({ global })` and `TraeCommand.getSettablePaths({ global })` return the CN-specific relative directory. Do not touch the shared `src/utils/tool-output-root.ts`.

**Alternatives:** add a Trae branch to `tool-output-root.ts` and strip `.trae`, following the deepagents pattern.

**Consequences:** Three source files change. The blast radius stays inside Trae, which keeps future upstream merges manageable.

**Evidence:** `skills-processor.ts` and `commands-processor.ts` pass `{ global }` to `getSettablePaths`; global output roots resolve to the home directory.

## D-006: Unified subagent authoring has a `tools` caveat

**Context:** The intended cross-platform subagent format is `name`, `description`, `tools`, plus the Markdown body, with `model` and `hooks` omitted.

**Decision:** Keep that authoring convention, but note that rulesync's canonical subagent schema has no top-level `tools`. Each target carries tools in its own section (for example `claudecode.tools` and `kimi-code.tools`).

**Alternatives:** add a shared `tools` field to `RulesyncSubagentFrontmatterSchema`.

**Consequences:** Tool lists must be repeated per target, or the canonical schema must be extended. Trae needs `trae.tools` as a comma-separated string.

**Evidence:** `RulesyncSubagentFrontmatterSchema`; `ClaudecodeSubagentFrontmatterSchema`; the subagent notes in `docs/reference/file-formats.md`.

## D-007: `main` mirrors upstream, `dev` is the personal mainline

**Context:** The fork must keep receiving upstream updates while personal features accumulate.

**Decision:** `main` carries no personal work and is fast-forwarded from `upstream/main`. `dev` is the long-lived integration branch. Features branch off `dev` and merge back into `dev`. Upstream changes flow `upstream/main` -> `main` -> `dev` by merge.

**Alternatives:** rebase `dev` onto upstream; manual synchronization without merges.

**Consequences:** Conflicts are resolved on `dev` with full history. `main` must stay clean so `git merge --ff-only upstream/main` always works. `dev` is never rebased.

**Evidence:** `AGENTS.md`, Fork Workflow section.

## D-008: Personal process documents live at the repository root

**Context:** Handoff and decision notes must survive across sessions without polluting the distributed product documentation.

**Decision:** Keep `HANDOFF.md` and `DECISIONS.md` at the repository root.

**Alternatives:** `docs/adr/`, `docs/guide/`, or embedding the content in `AGENTS.md`.

**Consequences:** No upstream merge conflicts, and the notes are not shipped to users. `docs/**/*.md` is embedded into `src/generated/docs-content.ts` by `scripts/generate-docs-content.ts`, so personal notes must not live there. `AGENTS.md` stays a rule file and only points at the two files.

## D-009: Delete `IMPLEMENTATION.md`

**Context:** The document was written before the code was inspected and described files and APIs that do not exist.

**Decision:** Delete it. The source of truth is the code plus this decision log.

**Alternatives:** update it and keep it as a second specification.

**Consequences:** No stale guidance. The content remains recoverable from git history.

**Evidence:** It used plural file names (`trae-rules.ts`), claimed hooks/permissions support that Trae does not have, and described a `getSettablePaths` signature that differs from the implementation.

## D-010: Trae subagents are unimplemented, not incompatible

**Context:** rulesync supports subagents for many targets but not Trae.

**Decision:** Keep Trae subagents out of scope for the CN path change. Revisit as a separate feature.

**Alternatives:** add `TraeSubagent` in the same branch.

**Consequences:** A future change needs a new class, a tuple/factory registration, tests, and docs. Trae requires `description`, uses a comma-separated `tools` allowlist plus `disallowedTools`, pins vendor-specific model names, and supports project and user scope. Only automatic delegation by `description` is documented; there is no @mention or slash command and no documented nesting.

**Evidence:** `subagentsProcessorToolTargetTuple` has no `trae`; there is no `trae-subagent.ts`; `docs.trae.cn/ide_subagents`.

## D-011: Trae MCP generation replaces the whole `mcpServers` object

**Context:** `TraeMcp` preserves other top-level keys of `.trae/mcp.json`, but replaces `mcpServers` with the rulesync source.

**Decision:** Migrate every MCP server into `.rulesync/mcp.jsonc`. Do not hand-maintain `.trae/mcp.json`.

**Alternatives:** merge per server with the existing file.

**Consequences:** Any server not present in the rulesync source disappears on the next generate.

**Evidence:** `src/features/mcp/trae-mcp.ts` builds `{ ...json, mcpServers }`.

## Pitfalls

### P-001: `~/.trae` can exist as an empty stub

Checking `~/.trae` first selects the wrong directory on a CN machine. Always test `~/.trae-cn` first.

### P-002: A symlink at the output path is written through

`~/.trae-cn/skills/grill-with-docs` points into the old aggregation repo. rulesync copies files, so generation writes through the link and modifies the source repo. Remove such links before global generation.

### P-003: `pnpm test -- <file>` and `pnpm test:e2e -- <file>` run the full suite

The `--` is forwarded to vitest as a literal argument, so the file filter is ignored. Use `pnpm exec vitest run <file>` or `pnpm exec vitest run --config vitest.e2e.config.ts <file>`.

### P-004: `tsx -e` fails on this dependency tree

`tsx -e "import ..."` hits `ERR_PACKAGE_PATH_NOT_EXPORTED` for `unicorn-magic/node`. Write a temporary `.mts` file and run `tsx /tmp/script.mts` instead.

### P-005: `check:docs-content` compares the worktree to the index

Running `pnpm cicheck` with unstaged documentation changes makes the drift check fail even when the generated file is correct. Stage or commit the docs before running it.

### P-006: Trae MCP replaces the whole `mcpServers` object

See D-011. This is both a decision and a trap: a server missing from `.rulesync/mcp.jsonc` is deleted from the generated file.

### P-007: The old `IMPLEMENTATION.md` was not trustworthy

It described plural file names, nonexistent hooks/permissions targets, and the wrong `getSettablePaths` signature. Prefer code and `docs/` as the source of truth.

### P-008: `.codebuddy/settings.local.json` breaks `oxfmt --check`

The committed JSON is not in oxfmt format, so `pnpm check` and `pnpm cicheck` fail until it is formatted: `pnpm exec oxfmt .codebuddy/settings.local.json`.
