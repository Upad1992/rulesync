# Session Handoff

Last updated: 2026-10-19

This file is the short-lived state of the fork. Read it first in a new session, then `DECISIONS.md`.
Update "Current state", "Completed", and "Next steps" at the end of every session. Do not turn it into a diary.

## Current state

- Branch: `dev` (tracks `origin/dev`). The Trae CN work ended at `a1cbe253`; this handoff and `DECISIONS.md` are a follow-up commit.
- `main` is the upstream mirror at `66422332`, identical to `origin/main`.
- `feat/trae-cn-path-detection` is kept as a historical snapshot at `16906cc2`.
- Working tree is clean.

## Completed

- Trae CN user-level path support:
  - `~/.trae-cn` is preferred for global scope; falls back to `~/.trae`.
  - Project scope always uses `.trae/`, for both editions.
  - Applies to skills and commands only, the only Trae features with global support.
  - Implemented in `src/utils/trae.ts`, `src/constants/trae-paths.ts`, and the two `getSettablePaths` methods.
- Unit tests and `src/e2e/e2e-trae-home.spec.ts` cover both the CN-hit and fallback paths.
- `docs/reference/file-formats.md` updated; `src/generated/docs-content.ts` regenerated.
- `IMPLEMENTATION.md` deleted; it was stale and contradicted the code.
- Fork workflow documented in `AGENTS.md`.

## Verification

- `pnpm test`: 15,180 passed, 4 skipped.
- `pnpm exec vitest run --config vitest.e2e.config.ts --silent=false src/e2e/e2e-trae-home.spec.ts`: 2 passed.
- Typecheck and oxlint pass.
- Manual CLI check with a temporary HOME:
  - CN home -> `.trae-cn/skills`, `.trae-cn/commands`
  - no CN directory -> `.trae/skills`, `.trae/commands`
  - project scope -> `project/.trae/...`

## Next steps

1. Before the first real global generate, remove the symlink that points into the old aggregation repo:
   `rm ~/.trae-cn/skills/grill-with-docs`
   Otherwise rulesync writes through it into `~/Workspace/IndependentProject/Agent`.
2. Optional: add Trae subagent support. It is not implemented; read D-010's Spec notes before starting.
3. Consolidate MCP servers into `.rulesync/mcp.jsonc`. Trae generation replaces the whole `mcpServers` object (D-011).
4. Distribute subagents to the platforms whose agent directories are still empty.
5. Keep the CodeArts fallback on the rsync script; rulesync has no CodeArts target.

## Environment facts

- `~/.trae/` exists but is an empty stub: no `skills/`, `commands/`, `rules/`, or `mcp.json`.
- `~/.trae-cn/` is the real user config, with `skills/` and `user_rules/`.
- Trae CN project configuration is still `.trae/`, not `.trae-cn/`.
- `~/.trae-cn/mcps/` is runtime cache, not MCP configuration; user-level MCP is managed in the IDE UI.

## Known issues

- `.codebuddy/settings.local.json` fails `oxfmt --check`, so `pnpm cicheck` currently fails on formatting. Run `pnpm exec oxfmt .codebuddy/settings.local.json`.
- `dev` was pushed manually after the previous session. Check `git status -sb` before starting work.
