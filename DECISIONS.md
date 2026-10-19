# Decisions

<!-- cspell:ignore agentsync traecn Doubao -->

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

**Spec notes (for a future change):**

- Locations: project `.trae/agents/<name>.md`; user `~/.trae-cn/agents/<name>.md` on Trae CN (international is expected to be `~/.trae/agents/`, but the published docs reuse the CN path, so verify at runtime before implementing global). The directory is flat; subdirectories are not documented.
- Frontmatter keys:
  - `name` (required): starts with a letter, then letters/digits/`-`, ends with a letter or digit, at most 50 characters.
  - `description` (required): a file without it cannot be parsed by Trae.
  - `model` (optional): a Trae vendor model name (for example `Doubao-Seed-2.1-Pro`, `DeepSeek-V4-Pro`, `glm-5.2`, `minimax-m3`, `kimi-k2.7-code`, `qwen-3.8-max` on CN; the international list differs). Omit it to inherit the current model.
  - `tools` (optional): comma-separated allowlist. An empty string disables every tool; omitting the key loads all tools.
  - `disallowedTools` (optional): comma-separated denylist; takes precedence over `tools`.
  - `mcpServers` (optional): list.
- Tool names: `Bash`, `Edit`, `Glob`, `Grep`, `Read`, `Skill`, `TodoWrite`, `WebFetch`, `WebSearch`, `Write`, `LSP`, `mcp__<server>__<tool>`.
- Body: the Markdown body is the system prompt.
- Invocation: automatic delegation by `description`; only the built-in Agent can call a subagent. No @mention, no slash command, and nesting is not documented.
- Scope: project and user are both supported. A project-level agent overrides a user-level agent with the same `name`.
- Unsupported keys: `hooks`, `permissionMode`, `skills`, `color`, `memory`, `effort`, `isolation`, `maxTurns`, `background`.
- Implementation sketch:
  - Add `"trae"` to `subagentsProcessorToolTargetTuple`.
  - Add `src/features/subagents/trae-subagent.ts` extending `ToolSubagent` (extract a shared Markdown base only if a second target needs it).
  - Implement `getSettablePaths({ global })`: project `.trae/agents`; global `join(getTraeUserDir(), "agents")`, reusing `src/utils/trae.ts`.
  - Map shared `name`/`description`; keep Trae-specific keys under a `trae:` block (`tools` string, `disallowedTools`, `model`, `mcpServers`). See D-006 for the missing shared `tools` field.
  - Validate that `description` is present; warn or skip when a rulesync subagent has none.
  - Register in `toolSubagentFactories` with `supportsProject: true` and `supportsGlobal: true`.
  - Add unit tests, project/global E2E coverage, a docs note, and regenerate the supported-tools tables.
- Open questions:
  - Whether Trae uses the file name or the frontmatter `name` when they differ.
  - Whether the international edition also reads `~/.trae-cn/agents/`; the binary scans both roots, but the docs do not distinguish them.
  - Whether Trae subagents can call other subagents; no nesting is documented.

## D-011: Trae MCP generation replaces the whole `mcpServers` object

**Context:** `TraeMcp` preserves other top-level keys of `.trae/mcp.json`, but replaces `mcpServers` with the rulesync source.

**Decision:** Migrate every MCP server into `.rulesync/mcp.jsonc`. Do not hand-maintain `.trae/mcp.json`.

**Alternatives:** merge per server with the existing file.

**Consequences:** Any server not present in the rulesync source disappears on the next generate.

**Evidence:** `src/features/mcp/trae-mcp.ts` builds `{ ...json, mcpServers }`.

## D-012: Trae subagents use the `trae:` block and CN-first user paths

**Context:** Trae documents user-defined subagents as Markdown files with YAML frontmatter, but rulesync had no Trae subagent target. The canonical subagent schema has no top-level `tools`, and Trae's user-level path is ambiguous: both the CN and international docs spell it as `~/.trae-cn/agents/`, while the existing Trae skills/commands support resolves `~/.trae-cn` first and falls back to `~/.trae`.

**Decision:** Add a native `trae` subagent target with project and global scope. Project files go to `.trae/agents/<name>.md`; global files resolve through `getTraeUserDir()`, so `~/.trae-cn/agents/` wins when that directory exists and `~/.trae/agents/` is the fallback. Keep Trae-specific keys in the `trae:` block (`model`, `tools` and `disallowedTools` as comma-separated strings, `mcpServers` as a string list). Do not add a shared top-level `tools` field. A missing or whitespace-only `description` falls back to the subagent name with a warning rather than aborting the run, and an invalid `name` is warned about but still written. Any other key in the `trae:` block is dropped with a warning because Trae silently ignores unknown keys. Nested sources are skipped for Trae (flat directory only).

**Alternatives:** project scope only; hardcode `~/.trae-cn/agents/` for every edition; add a shared canonical `tools` field (rejected by D-006); throw on a missing description; implement a shared skip hook in the processor; validate `model` against a vendor list; rename output files to the frontmatter `name`.

**Consequences:** The international `~/.trae/agents/` path remains inferred, not documented; the docs note records that. A Trae-targeted subagent without a description produces a parseable file but may route poorly until the author adds one. A Trae user who writes `hooks`/`permissionMode`/`skills`/`color`/`memory` inside the `trae:` block gets a warning and loses the key. The diff stays inside Trae plus two registration points.

**Evidence:** `https://docs.trae.ai/ide/subagents` and `https://docs.trae.cn/ide_subagents` both list `~/.trae-cn/agents/`; the Trae CN client contains a "peer product global directory (e.g. `.trae` ↔ `.trae-cn`)" setting; `src/utils/trae.ts`, `src/features/subagents/trae-subagent.ts`, and the Trae unit/E2E tests.

## D-013: CodeArts CLI is a first-class target for rules, skills, commands, subagents and MCP

**Context:** CodeArts CLI is an OpenCode fork shipped by Huawei. It shares `.codeartsdoer/` with the CodeArts Agent IDE for rules, skills, commands and subagents, but reads a different MCP file. Its instruction model has no modular rules directory, its skills loader keeps only `name` and `description`, and its subagent `tools` field is a name→boolean map. The fork needs it as a generation target because the old symlink aggregation cannot express these files.

**Decision:** Add a `codearts-cli` target with project and global scope for rules, skills, commands, subagents and MCP.

- Rules: project `./AGENTS.md`, global `~/.codeartsdoer/AGENTS.md`, `collisionPolicy: "fold"`. The CLI walks up and stops at the first of `AGENTS.md` / `CLAUDE.md` / `CONTEXT.md`, so there is no nested or modular rule surface.
- Skills: `.codeartsdoer/skills/<name>/SKILL.md` in both scopes. Only `name` and `description` are written; supporting files are copied. A description shorter than 10 characters is the author's responsibility, not a generation error.
- Commands: `.codeartsdoer/commands/<name>.md` in both scopes. `description` is canonical; `agent`, `model` and `subtask` come from the `codearts-cli:` block.
- Subagents: `.codeartsdoer/agents/<name>.md` in both scopes. `mode` defaults to `subagent`, `model` is `provider/model`, `tools` is a map, and the rest of the block is passed through. A missing description falls back to the name with a warning.
- MCP: the `mcp` key of `.codeartsdoer/codearts_cli.json` (project) and `~/.codeartsdoer/codearts_cli.json` (global). `local` carries `command: string[]` and `environment`; `remote` carries `url` and `headers`. Other top-level keys are preserved, the `mcp` object is replaced wholesale, and the file is never deleted.
- Out of scope: hooks (CodeArts implements them as TypeScript plugins, not declarative config), permissions (the effective store is `~/.codeartsdoer/cli-data/storage/permission/global.json`, outside the project), ignore (no `.codeartsdoerignore`; `.codebaseignore` only feeds the index), and `.codeartsdoer/rule/*.mdc` (IDE cloud rule center).
- The IDE MCP file `.codeartsdoer/mcp/mcp_settings.json` is not written. A later `codearts-ide` target can add it; the shared directories must not be written twice.

**Alternatives:** one neutral `codearts` target (rejected: the IDE MCP path differs, so the split is real); project scope only (rejected: the CLI supports both scopes); a shared top-level `tools` field (rejected by D-006); symlink detection in the shared write layer (rejected: cross-tool behavior change and merge cost).

**Consequences:** Adding `codearts-cli` to `rulesync.jsonc` changes the owner of the project-root `AGENTS.md` (last target in config order wins, `src/lib/generate.ts:1071`). The fork does not add the target to its own config yet. `~/.codeartsdoer/AGENTS.md` is currently a symlink into the old aggregation repo, so a real global generate must replace it first; E2E uses a fake home.

**Evidence:** `src/features/rules/codearts-cli-rule.ts`, `src/features/skills/codearts-cli-skill.ts`, `src/features/commands/codearts-cli-command.ts`, `src/features/subagents/codearts-cli-subagent.ts`, `src/features/mcp/codearts-cli-mcp.ts`, `src/constants/codearts-cli-paths.ts`; local binary `~/.codeartsdoer/installers/bin/codearts` strings (`OPENCODE_CONFIG_FILE=codearts_cli.json,codearts_cli.jsonc`, local/remote MCP schemas, 21 hook events); `~/.codeartsdoer/AGENTS.md` symlink; `https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0019.html` (skills), `..._0031.html` (agents), `..._0010.html` (commands), `..._0035.html` (MCP).

**Spec notes (for a future change):**

- `.codeartsdoer/rule/<name>.mdc` + `metadata.properties` is the IDE rule center; whether the CLI injects it into the prompt is unverified. Do not generate it.
- The CLI also reads `CLAUDE.md` and `CONTEXT.md` as fallbacks; rulesync writes only `AGENTS.md`, which the CLI checks first.
- Global instructions also fall back to `~/.claude/CLAUDE.md`; this target does not write it.
- `codearts_cli.jsonc` is accepted by the CLI, but rulesync writes only `.json` so a project never holds both.
- The CLI merges user-level and project-level `mcp` maps, project winning on a name clash.

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

### P-009: CodeArts subagents do not appear in the agent picker

`mode: subagent` agents are only reachable through delegation by the main agent; the TUI's "Select agent" list shows primary agents only. Verify a subagent by delegating to it and checking the reply, not by looking for it in the picker. Use `mode: all` if it must be selectable.
