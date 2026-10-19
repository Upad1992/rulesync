# Session Handoff

Last updated: 2026-10-19

This file is the short-lived state of the fork. Read it first in a new session, then `DECISIONS.md`.
Update "Current state", "Completed", and "Next steps" at the end of every session. Do not turn it into a diary.

## Current state

- Branch: `feat/trae-subagent`, based on `dev` at `6a99bcba`. The Trae subagent feature is implemented and verified here; `dev` does not contain it yet.
- `main` is the upstream mirror at `66422332`, identical to `origin/main`.
- `.codebuddy/settings.local.json` was formatted in `0b9f50b` so `pnpm cicheck` passes.
- The only uncommitted change is a pre-existing local hook edit in `.claude/settings.json`; it is intentionally not part of the feature commits.

## Completed

- Native Trae subagent support:
  - Project `.trae/agents/<name>.md`; user scope resolves through `getTraeUserDir()` (`~/.trae-cn/agents/` when the CN directory exists, otherwise `~/.trae/agents/`).
  - YAML frontmatter + Markdown body; `name`/`description` required, optional `model`, `tools` (comma-separated string, `""` disables every tool), `disallowedTools` and `mcpServers`.
  - Unknown keys in the `trae:` block are dropped with a warning. A missing or whitespace-only description falls back to the name with a warning; an invalid name is warned about but still written.
  - Flat directory only; nested sources are skipped by the processor.
- Registration: `subagentsProcessorToolTargetTuple`, `toolSubagentFactories`, canonical `trae:` section in `RulesyncSubagentFrontmatterSchema`.
- Unit tests, project/global E2E coverage (including CN hit and `~/.trae` fallback), docs note, generated tables and `docs-content`, and the derived `.gitignore` entry.
- Decision recorded as D-012.

## Verification

- `pnpm cicheck`: 15,197 passed, 4 skipped; formatting, oxlint, typecheck and all content checks pass.
- `pnpm exec vitest run --config vitest.e2e.config.ts src/e2e/e2e-subagents.spec.ts src/e2e/e2e-trae-home.spec.ts`: 166 passed.
- `src/features/subagents/trae-subagent.test.ts`: 17 passed.
- `src/features/subagents/subagents-processor.test.ts`: 104 passed, 1 skipped.
- Manual CLI check has not been run against a real Trae installation yet.

## Next steps

1. Merge `feat/trae-subagent` into `dev` after review; do not push without an explicit request.
2. Enable `Settings > Beta > Subagents` in Trae CN, run `rulesync generate --targets trae --features subagents`, and confirm the generated agents appear in Trae.
3. The international `~/.trae/agents/` path remains inferred: both published docs spell `~/.trae-cn/agents/`, and only the CN app is installed here. Verify on an international install when available.
4. Before the first real global generate, remove the symlink that points into the old aggregation repo:
   `rm ~/.trae-cn/skills/grill-with-docs`
5. Consolidate MCP servers into `.rulesync/mcp.jsonc`. Trae generation replaces the whole `mcpServers` object (D-011).
6. Distribute subagents to the platforms whose agent directories are still empty.
7. Keep the CodeArts fallback on the rsync script; rulesync has no CodeArts target.

## Environment facts

- `~/.trae/` exists but is an empty stub: no `skills/`, `commands/`, `rules/`, or `mcp.json`.
- `~/.trae-cn/` is the real user config, with `skills/` and `user_rules/`.
- Trae CN project configuration is still `.trae/`, not `.trae-cn/`.
- `~/.trae-cn/mcps/` is runtime cache, not MCP configuration; user-level MCP is managed in the IDE UI.

## Known issues

- `.claude/settings.json` carries an uncommitted local `UserPromptSubmit` hook; leave it alone unless the user asks.
- P-005 still applies: `check:docs-content` compares the worktree to the index, so stage documentation changes before running `pnpm cicheck`.
