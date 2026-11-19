# Decisions

<!-- cspell:ignore agentsync traecn Doubao forwardable codegraph hezi repointed repoints -->

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

## D-015: Track upstream by full fast-forward, activate selectively

**Context:** Upstream was 1020 commits ahead of the local `main` (versions 37.1.0 to 43.9.0). The fork adds targets upstream does not support, plus localizations of targets it does support. The user wants every upstream adaptation to platforms it already supports to be followed up.

**Decision:** Fast-forward `main` from `upstream/main` with `--ff-only` and merge `main` into `dev`. Take all five categories of upstream change (existing-platform fixes and features, new tool targets, core and security changes, dependency and major-version bumps, docs and generated artifacts). "Partial" means the activation scope in `rulesync.jsonc`, not a selective set of commits: no commit-level cherry-picking, so `main` stays a clean mirror and `git merge --ff-only upstream/main` keeps working. "Mirror" here does not mean a live replica; `main` may lag upstream between syncs. Do not use GitHub's "Sync fork"; fix the local `git fetch upstream` instead. Do not push `main` or `dev` until acceptance passes and a separate authorization is given.

**Alternatives:** cherry-pick selected commits into `main`; sync through GitHub "Sync fork" and fetch from `origin`; push `main` immediately so the fork page looks current; keep `main` permanently behind upstream.

**Consequences:** `main` carries no local work and is always fast-forwardable; conflicts are resolved once on `dev` with full history. All upstream targets land in the tree even when the fork does not enable them. A major toolchain bump arrives together with the sync.

**Evidence:** `AGENTS.md:138-141`; D-007; `git rev-list --left-right --count main...upstream/main` = `0 1020`; `package.json:3` = `43.9.0`.

## D-016: Resolve upstream/local conflicts by acceptance, defaulting to local-first

**Context:** Local customizations (Trae CN-first user paths, Trae subagents, `codearts-cli` and `codearts-ide` targets) overlap upstream files. A blanket "ours" or "theirs" rule is wrong in either direction.

**Decision:** Use the acceptance suite as the arbiter, with local-first (option B) as the default implementation: keep the local customization and rewrite the upstream change to fit it (for example route the upstream Trae permission path through `getTraeUserDir()` instead of hardcoded `.trae/permission`). Add one regression assertion so the acceptance suite can actually distinguish A (upstream as-is) from B (local-first); without it, both pass `pnpm cicheck` and the rule silently degenerates to the default. Fallback chain: B, then A or C (merge but do not enable).

**Alternatives:** always prefer upstream; implement both A and B and pick whichever passes; exclude overlapping changes entirely.

**Consequences:** Every future upstream change touching Trae needs a manual review. The Q12 assertion is the only scope expansion of the acceptance criteria.

**Evidence:** D-002, D-003, D-012; upstream commit `d2b7a695` (Trae global permissions hardcoded to `.trae/permission`); `AGENTS.md:9-14,22,23,50` for the acceptance suite.

## D-017: Port local targets onto the 43.9.0 architecture instead of resolving merge markers

**Context:** Merging `main` into `dev` produced 11 conflicted files, but the real incompatibility is structural: upstream 43.9.0 replaced Trae base classes (`TraeCommand` now extends `FrontmatterMarkdownToolCommand`), replaced `getTraeCommandsDirPath()` with `TRAE_COMMANDS_DIR_PATH`, refactored `rules-processor.ts` into tool-rule factories, moved about 20 `src/cli/commands/*` files to `src/lib/*`, and switched the build toolchain from `tsdown`/oxlint/oxfmt to `vp` (vite+). It also added `trae-permissions.ts` and `trae-hooks.ts`, which the fork had explicitly kept out of scope.

**Decision:** Treat the work as a port, not a conflict resolution. Use upstream 43.9.0 as the base and re-apply the local customizations (CN-first paths, Trae subagents, both `codearts-*` targets, tuple and processor registrations, docs and generated artifacts) on top. Run `pnpm typecheck` first to size the damage, then iterate to `pnpm cicheck` green. Hand off to a fresh session via `HANDOFF.md`, `DECISIONS.md` and `GLOSSARY.md` rather than carrying a long interview session into the port.

**Alternatives:** abort the merge and only cherry-pick the frontmatter RCE fix; defer the whole merge; mechanically resolve markers with "ours" or "theirs".

**Consequences:** 18+ local files may need rewriting, and D-016's "local-first" has to be re-expressed against new base classes. The `main` mirror is already updated, so the port can be redone from a clean state at any time.

**Evidence:** `package.json:3` = `43.9.0`; merge output (11 `UU` files, about 20 `R`, 5 `D`, 200+ `A`); stage 2 versus stage 3 of `src/features/commands/trae-command.ts`; `package.json:47-69` (generate scripts and `cicheck` still present).

## D-018: Finish the 43.9.0 port as one merge commit on dev

**Context:** Upstream 43.9.0 was merged into `dev` with 11 conflicts. The port could be isolated on a temporary branch, validated only after landing on `dev`, or followed by a local package/install step.

**Decision:** Keep the in-progress merge on `dev`, resolve it with 43.9.0 as the base (D-017), re-apply every local customization, and commit one merge commit once `pnpm cicheck` and the E2E matrix are green. Do not create a dedicated merge branch, do not package or install locally in this round, do not push `main`/`dev`, and switch back to `feat/codearts-ide` afterwards. Defer D-014/P-010 numbering reconciliation (3A, P-013).

**Alternatives:** A dedicated `port/43.9.0` branch (A2); a post-commit validation branch (A3); a local bundle/install (B2/B3); pushing `main`/`dev`.

**Consequences:** `dev` keeps full merge history and `main` stays a clean mirror. Local install stays a later, separately authorized task. The two handoff-document versions and the numbering stay unreconciled until `feat/codearts-ide` is merged.

**Evidence:** HANDOFF.md Next steps 1-10; D-015/D-016/D-017; this session's `pnpm cicheck` (exit 0) and E2E results.

## D-019: Defer real-platform verification to a new session and keep it isolated

**Context:** After the 43.9.0 merge landed on `dev` as `309aa38`, the user asked whether the locally adapted platforms had been tested. The automated suite covers them (E2E 28 files / 1538 tests for `codearts-cli`, `codearts-ide`, `trae`; the Q12 unit assertion), but HANDOFF Next steps 8 had deferred B1. The user approved doing the real-platform verification, then chose to end the session and hand execution to a new one.

**Decision:** Do not run the verification in the handoff session; record the approved plan in `HANDOFF.md` and execute it in the next session. Use an isolated project directory plus a pseudo-home via `HOME_DIR`; never generate into the real `~/.trae-cn` / `~/.codeartsdoer` trees. Select the six targets (`zcode`, `trae`, `codebuddy`, `claudecode`, `codearts-cli`, `codearts-ide`) through CLI `--targets` / `--features` instead of editing the committed `rulesync.jsonc`. GUI-only checks in the platform manuals stay with the user; the agent must not perform them or mark them verified. End the handoff session on `dev` with `HANDOFF.md` / `DECISIONS.md` committed, so the new session reads the current state.

**Alternatives:** generate directly into the real home directories (rejected: `delete: true` plus `~/.codeartsdoer/AGENTS.md` and `~/.trae-cn/user_rules` symlinks would write through into the aggregation repo, P-002); activate local targets in `rulesync.jsonc` (rejected: pollutes the committed config); re-run only the E2E subset (rejected: does not exercise the real CLI or the manuals).

**Consequences:** The new session starts on `dev` with a green `pnpm cicheck` state. Every `pnpm` command runs `prepare` -> `pnpm generate`, so `AGENTS.md` and `.claude/settings.json` must be verified and restored after the last `pnpm` command and before the commit (P-014). The manuals were last verified against `2d93b7cd` (2026-10-20), so their path / frontmatter sections need a drift review against 43.9.0. The two handoff-document versions and numbering stay unreconciled (P-013).

**Evidence:** HANDOFF.md Next steps; `dev:package.json` (`"prepare": "vp config --no-agent && pnpm generate"`); `dev:rulesync.jsonc` (`"delete": true`, object-form `targets`); `dev:docs/reference/cli-commands.md`; `/Users/hezi/Workspace/IndependentProject/Agent/user-agents/platforms/rulesync/README.md` (last checked 2026-10-20, `2d93b7cd`); user approval on 2026-11-18.

## D-020: Execute D-019 with isolated real-CLI runs; record 43.9.0 Trae drift without fixing source

**Context:** D-019 deferred real-platform verification to a new session. The automated suite (E2E 28 files / 1538 tests) covers `codearts-cli`, `codearts-ide` and `trae`, but exercises the processors rather than the installed CLI plus the platform manuals. The manuals were last checked against `2d93b7cd` (2026-10-20), 1020 commits behind 43.9.0. `dev:rulesync.jsonc` has `"delete": true`, and real-home symlinks make a real global generate unsafe (P-002, D-013).

**Decision:** Run the real `generate` CLI for six targets (`zcode`, `trae`, `codebuddy`, `claudecode`, `codearts-cli`, `codearts-ide`) in an isolated project under `/tmp/rulesync-platform-check/`, with `HOME_DIR` pointing to a pseudo-home and `--config` / `--input-roots` / `--output-roots` pinning every input and output inside the isolated tree. Select targets via CLI `--targets` / `--features` instead of editing the committed `rulesync.jsonc`. Produce a drift list and a GUI verification checklist in `PLATFORM-VERIFICATION.md`, update only the external platform manuals (Chinese), and do not change fork source or the committed config. Record discovered defects; fix none in this round. GUI-only checks stay with the user.

**Alternatives:** generate into the real home (rejected: symlink write-through); re-run the E2E subset (rejected: does not exercise the CLI entrypoint or the manuals); activate local targets in `rulesync.jsonc` (rejected: pollutes the committed config).

**Consequences:** Six targets pass dry-run / generate / check with no drift; global outputs land in the pseudo-home and the real home is unchanged. An invocation gotcha (P-015) and two 43.9.0 Trae defects (P-016) surfaced that unit/E2E tests miss, plus major manual drift on Trae (43.9.0 added hooks and permissions). These are recorded, not fixed — a source fix is a separate, separately authorized change.

**Evidence:** `PLATFORM-VERIFICATION.md`; `src/constants/trae-paths.ts:28,60-62`; `src/features/permissions/trae-permissions.ts:436`; `src/features/shared/shared-config-gateway.ts:1408`; `src/features/hooks/trae-hooks.ts:80`; `src/config/config-resolver.ts:480-510`.

## D-021: Install the fork's 43.9.0 build as the global CLI via the `add -g` fallback

**Context:** D-018 deliberately deferred local packaging/install. The global `rulesync` was still registry 36.0.2 while the fork is 43.9.0, and `dist/cli/index.js` (the `package.json:42` bin target) did not exist because `vp pack` had never run. The user approved making the global command run the fork's 43.9.0.

**Decision:** Build with `./node_modules/.bin/vp pack` directly (bypassing `pnpm`, so `prepare` -> `pnpm generate` cannot rewrite `AGENTS.md` / `.claude/settings.json`, P-014), then install with `pnpm add -g --ignore-scripts file:<repo>` — the fallback already approved in the plan — because `pnpm link --global` is rejected by pnpm v12.21.0 (`pnpm link --help` shows no global option). Verify with five assertions and document the upgrade command in the external `platforms/rulesync/README.md`. Do not commit the `Agent` repo.

**Alternatives:** `pnpm link --global` (rejected: absent on pnpm v12); hand-editing the shim (rejected: not pnpm-managed); `pnpm add -g rulesync@43.9.0` from the registry (rejected: loses the fork's `codearts-*` and Trae CN changes); leaving 36.0.2 (rejected by the user).

**Consequences:** `rulesync --version` = 43.9.0; the global bundle contains `codearts-ide`. The shim path string is unchanged, but pnpm repointed the same virtual-store slot to a new copy whose `package.json:3` = 43.9.0. The installed `dist/cli/index.js` is a hard link to the repo's build (shared inode, link count 2), not a copy — yet `vp pack`'s `clean: true` deletes and recreates `dist/` on every build, breaking the link, so each upgrade must re-run both commands (P-017). `git status --porcelain` stayed empty. pnpm removed the old 36.0.2 slot, so a clean rollback is `pnpm add -g rulesync@36.0.2`, not restoring the backed-up shim alone. Backups: `/tmp/codebuddy-backups/20261118-171928/`.

**Evidence:** `package.json:3,42,48,73`; `vite.config.ts:9-16`; `rulesync.jsonc:55`; `pnpm link --help` / `pnpm add --help`; `~/Library/pnpm/bin/rulesync:111`; `rulesync --version` = 43.9.0; `codearts-ide` found in both bundles; shared inode between the repo and installed `dist/cli/index.js`; `git status --porcelain` (empty); `platforms/rulesync/README.md`.

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

### P-011: Upstream 43.9.0 replaced Trae base classes and moved CLI commands

`TraeCommand` extends `FrontmatterMarkdownToolCommand` upstream but `ToolCommand` locally; `getTraeCommandsDirPath()` was replaced by `TRAE_COMMANDS_DIR_PATH` (hardcoded `.trae`, no `.trae-cn`); `src/cli/commands/*` moved to `src/lib/*`; the `tsdown`, oxfmt and oxlint configs were removed in favour of `vp`. Local CN-first logic and the `codearts-*` targets must be re-based rather than merged at the marker level. See D-017.

### P-012: An unresolved merge plus unstaged handoff docs is fragile

The `dev` worktree is left with `git merge main` in progress and 11 unresolved conflicts. `git merge --abort` discards all worktree edits, including `HANDOFF.md`, `DECISIONS.md` and `GLOSSARY.md`. Copy those three files out of the repository before aborting. Backups live under `/tmp/codebuddy-backups/20261117-200706/`.

### P-013: `dev` has older copies of the process documents than `feat/codearts-ide`

`feat/codearts-ide` (`2d93b7c`) carries D-014, P-010 and the 2026-10-20 `HANDOFF.md`; the `dev` worktree has the 2026-10-19 / D-013 / P-009 versions. New decisions here start at D-015 and new pitfalls at P-011 on purpose, leaving D-014 and P-010 free. When `feat/codearts-ide` is merged, reconcile the numbering and the two handoff versions.

### P-014: `pnpm generate` overwrites generated files holding fork-only content

When `pnpm`'s `verifyDepsBeforeRun` triggers an install, the `prepare` hook runs `pnpm generate`, and `rulesync.jsonc` regenerates the root `AGENTS.md` and `.claude/settings.json`. Content added by hand to those two files — the `Fork Workflow` / `Session Handoff` sections (D-008) and the `UserPromptSubmit` codegraph hook (8ee6e0594) — is dropped whenever that regeneration happens (observed on the first `pnpm typecheck` after the 43.9.0 sync, but not on every command). Verify the two files before committing, and restore/stage that content after the last command that regenerates them and right before `git commit`, which does not run `prepare`. The `pnpm cicheck` drift checks do not cover these files, so a green cicheck is unaffected. Moving the content into `.rulesync/` sources is the durable fix but is out of scope here.

### P-015: `pnpm -C` plus an absolute `--config` is rejected by the traversal guard

`ConfigResolver.resolve()` validates `configPath` against `resolve(process.cwd())` (`src/config/config-resolver.ts:480-510`, `src/utils/file.ts:451-468`), so an absolute `--config` outside cwd throws `Path traversal detected`. `pnpm -C <repo>` keeps cwd at the repo root, so `pnpm -C <repo> dev generate --config /tmp/.../rulesync.jsonc` fails. For isolated verification, run the exact CLI that `pnpm dev` wraps — `./node_modules/.bin/tsx src/cli/index.ts` — with cwd set to the isolated project and a relative `--config rulesync.jsonc`; then `--input-roots` / `--output-roots` stay inside the isolated tree and no `pnpm` `prepare` is re-triggered (P-014). `--global` also overrides `outputRoots` with `getHomeDirectory()`, which honors `HOME_DIR`.

### P-016: Trae CN-first + global permissions fails, and global hooks ignore CN-first

43.9.0 added Trae hooks (`trae-hooks.ts`) and permissions (`trae-permissions.ts`). `TraePermissions.getSettablePaths()` resolves CN-first through `getTraeUserDir()`, producing `.trae-cn/permission/global.json` when `~/.trae-cn/` exists, but `SHARED_CONFIG_OWNERSHIP` (`src/features/shared/shared-config-gateway.ts:1408`) declares only the international `.trae/permission/global.json`, so `generate --global --targets trae --features permissions` exits 1 on a CN machine. `TraeHooks.getSettablePaths()` hardcodes `.trae/hooks.json`, so global hooks are **not** CN-first even though skills / commands / subagents are. The Q12 unit test (`trae-permissions.test.ts:80`) only asserts `getSettablePaths`, and the E2E permissions test uses a fresh home without `.trae-cn`, so neither reaches the gateway write. Verify Trae global permissions on a CN home with the real CLI before trusting a green suite. Recorded in `PLATFORM-VERIFICATION.md`; not fixed here (source change is out of scope for D-019/D-020).

### P-017: pnpm v12 has no global `link`, and `add -g file:` hard links the build

`pnpm link --global` fails on pnpm v12.21.0 (`unexpected argument '--global'`); `pnpm link --help` lists only `[PACKAGE_PATHS]...`. Use `pnpm add -g --ignore-scripts file:<repo>` instead (D-021). Three traps: (1) the shim path string is unchanged — pnpm repoints the same virtual-store slot rather than referencing the worktree — so do not expect the shim to literally point at the repo; (2) `file:` installs the build as a hard link to the repo's `dist/`, which looks self-updating, but `vp pack` has `clean: true` (`vite.config.ts:14`) and recreates `dist/` on every build, breaking that link; (3) `--ignore-scripts` is required or `prepare` -> `pnpm generate` may rewrite `AGENTS.md` / `.claude/settings.json` (P-014). Therefore every fork upgrade needs both `./node_modules/.bin/vp pack` and `pnpm add -g --ignore-scripts file:<repo>`, and `~/Library/pnpm/bin/rulesync` must never be hand-edited. pnpm also removed the old 36.0.2 slot during install, so restoring only the backed-up shim does not roll back.

### P-018: `CONTEXT.md` in this repo is an external tool fact, not the project glossary

The root glossary was renamed `CONTEXT.md` -> `GLOSSARY.md` on 2026-11-20 with the frozen V3.1 migration script (backup `.context-migration-backup-20261119-235800.tar.gz`), but the 11 remaining `CONTEXT.md` strings (`README.md:179`, `docs/reference/file-formats.md:598`, `docs/reference/supported-tools.md:136`, `src/generated/docs-content.ts:41,45`, `DECISIONS.md:183,200`, `HANDOFF.md:19`, `src/constants/antigravity-cli-paths.ts:24`, `src/features/rules/tool-rule-factories.ts:525`, `src/features/rules/codearts-cli-rule.ts:34`) describe Antigravity / CodeArts CLI file discovery or the platform-verify backup inventory — replacing them would falsify tool documentation and source comments. Never mass-replace `CONTEXT` in this repo: the project's own glossary references live only in the handoff trio (`HANDOFF.md`, `DECISIONS.md`, `GLOSSARY.md`). CodeArts instruction loading is unchanged by the rename because the git root already has `AGENTS.md`, which takes priority over the `CONTEXT.md` fallback.
