# Session Handoff

<!-- cspell:ignore codearts codeartsdoer codeartsagent CODEARTS dyoshikawa Upad1992 traecn codebuddy oxlint oxfmt tsdown vite forwardable codegraph -->

Last updated: 2026-11-18

This file is the short-lived state of the fork. Read it first in a new session, then `DECISIONS.md`.
Update "Current state", "Completed", and "Next steps" at the end of every session. Do not turn it into a diary.

## Current state

- `git merge main` into `dev` is **still in progress and uncommitted**, but all 11 conflicts are resolved in the worktree. `git diff --name-only --diff-filter=U` lists 7 files that are fixed but NOT yet staged: `src/constants/trae-paths.ts`, `src/features/commands/trae-command.test.ts`, `src/features/commands/trae-command.ts`, `src/features/rules/rules-processor.test.ts`, `src/features/rules/rules-processor.ts`, `src/features/skills/skills-processor.test.ts`, `src/features/skills/trae-skill.test.ts`.
  - The other 4 conflicted files (`README.md`, `docs/reference/file-formats.md`, `docs/reference/supported-tools.md`, `src/generated/docs-content.ts`) were already staged with `git add` (P-005). ~1300 upstream files from the merge are also staged in the index.
- `main` == `upstream/main` == `0cf7642ba9bb0fe78711bc5697d3024e15be82f2`. `origin/main` = `66422332` (not pushed, Q13=A), `origin/dev` = `6a99bcba`. `dev` HEAD before the commit is `0d8ffe43`.
- Upstream is **43.9.0** (`package.json:3`), 1020 commits ahead of the old `main`. Architectural rewrite (D-017 / P-011): rules registrations moved into `src/features/rules/tool-rule-factories.ts`, `PROCESSOR_REGISTRY` in `src/types/processor-registry.ts`, `vitest` imports replaced by `vite-plus/test`, `tsdown`/oxfmt/oxlint replaced by `vp`, `TraeCommand` now extends `FrontmatterMarkdownToolCommand`, new hooks/permissions/checks features.
- `feat/codearts-ide` (`2d93b7c`) still carries one commit not merged into `dev`: the `codearts-ide` target (D-014), P-010, and the 2026-10-20 versions of this file and `DECISIONS.md`. The `dev` worktree has the older copies. See P-013. Per 3A, no numbering reconciliation this round.
- Handoff docs: `HANDOFF.md` / `DECISIONS.md` are modified but unstaged; `CONTEXT.md` is untracked. Per 2A, all three go into the commit.
- 4 untracked files to add: `CONTEXT.md`, `src/constants/codearts-ide-paths.ts`, `src/features/mcp/codearts-ide-mcp.ts`, `src/features/mcp/codearts-ide-mcp.test.ts`.
- **P-014 trap (important)**: when `pnpm`'s `verifyDepsBeforeRun` triggers an install, the `prepare` hook runs `pnpm generate`, which regenerates root `AGENTS.md` and `.claude/settings.json` from `.rulesync/rules/*.md` and drops fork-only content (the `Fork Workflow` / `Session Handoff` sections, and the `UserPromptSubmit` -> `codegraph prompt-hook`). Observed on the first `pnpm typecheck` after the 43.9.0 sync, but NOT on every `pnpm` command (`pnpm cspell` after restoration left both intact), so always verify rather than assume. Both are currently restored in the worktree (verified: 2 section headings + 1 hook); their index(:0) copies also still contain the fork content. The 43.9.0 text updates (`tool-rule-factories.ts`, `pnpm exec vp test run --silent=false`) are kept per the user's decision "restore local + accept upstream text". The active pre-commit hook is `.vite-hooks/_/pre-commit` -> `.vite-hooks/pre-commit` (`vp staged`); it does NOT trigger `generate`, so "restore -> stage -> commit" with no intervening regeneration is safe.
- Backups: `/tmp/codebuddy-backups/20261118-port-session/` — three handoff docs, 11 original conflicted files (with markers), `codearts-ide-src/` branch dumps, `resolve-file-formats.py`, and all logs (`typecheck-*.txt`, `cicheck-*.txt`, `unit-all.txt`, `e2e-full.txt`, `proc-tests.txt`). Original backup `/tmp/codebuddy-backups/20261117-200706/` is still valid.

## Completed

- Decision interview Q1-Q13 -> D-015..D-017. This session's choices A1/B1/1A/2A/3A and "no extra acceptance scope" recorded as **D-018**; **P-014** added to `DECISIONS.md`.
- Port (D-017, local-first D-016), 43.9.0 as base:
  - `trae-paths.ts`: merged 43.9.0 hooks/permission constants with local CN-first constants; added `TRAE_PERMISSION_DIR_NAME`.
  - `trae-command.ts`: kept `FrontmatterMarkdownToolCommand` base, `getSettablePaths({global})` back to `getTraeCommandsDirPath`.
  - `utils/trae.ts`: added `getTraePermissionDirPath`; `trae-permissions.ts` `getSettablePaths` now CN-first (Q12).
  - `tool-rule-factories.ts`: added the missing `codearts-cli` entry (tuple had it; factory map did not — `tool-targets.test.ts` asserts schema keys == factory keys).
  - `codearts-cli-command.ts` + test: dropped `fileContent` (43.9.0 `RulesyncCommandParams` no longer accepts it).
  - `codearts-ide` target restored from `2d93b7c` and re-based onto 43.9.0 factory map: 3 new files + `mcp-processor.ts` entry + mcp tuple + `tool-display.ts` + `tool-targets.test.ts` + `mcp-processor.test.ts` + `e2e-mcp.spec.ts` (matrix row + dedicated test) + file-formats prose.
  - CN-first tests restored in `trae-command.test.ts` / `trae-skill.test.ts` (with `HOME_DIR` stubs); 7 target-list assertions in `rules-processor.test.ts` / `skills-processor.test.ts` updated for `codearts-cli`; rules global length 51 -> 52.
  - `vitest` -> `vite-plus/test` imports in 9 local test files (43.9.0 `vp` toolchain / oxlint `prefer-vite-plus-imports`).
- **Q12 regression assertion**: `trae-permissions.test.ts` "resolves the Trae CN user root for the permission file (Q12)" — passes, and distinguishes upstream-as-is (A) from local-first (B).
- Generated artifacts: `generate:docs-content`, `generate:tables`, `pnpm dev gitignore` re-run and staged; idempotency confirmed (3 identical hashes). `src/generated/docs-content.ts` = 20 docs, includes CodeArts Agent IDE MCP note; README / supported-tools tables and `.gitignore` include `codearts-ide` and `.codeartsdoer/mcp/mcp_settings.json`.
- Manual review (Next steps 7): Each File Format prose restored via `resolve-file-formats.py` (spans the 2 conflict blocks, keeps all local CodeArts / Trae CN notes, re-adds the IDE MCP note). `AGENTS.md:46` now correctly points at `tool-rule-factories.ts`; the singular `additionalConvention` there is upstream's own wording in the generation source `.rulesync/rules/feature-change-guidelines.md:9` and is left unchanged (changing it would diverge from the generation source, D-015). New `codearts-cli` factory entry needs no `additionalConventions`.
- cspell: `forwardable` (D-015) and `codegraph` (P-014) added to `DECISIONS.md` ignore comment.
- User decision on the `pnpm generate` side-effect: **restore local + accept upstream text** for `AGENTS.md` and `.claude/settings.json` (see Current state).

## Verification

- `pnpm typecheck`: no `error TS` (typecheck-4.txt). Note: `pnpm` commands run `prepare` -> `pnpm generate`; the first runs failed until `trae-paths.ts` constants were restored.
- Full unit suite: **623 files / 17062 passed, 4 skipped** (`unit-all.txt`, `cicheck-4.txt`).
- `pnpm cicheck`: **EXIT=0** (`cicheck-4.txt`) — fmt:check, oxlint, typecheck, 17062 tests, check:sync-skill-docs, check:docs-content, check:gitignore, check:supported-tools, cspell (0 issues), secretlint.
  - **WARNING**: `cicheck-4` was run BEFORE the final edits to `HANDOFF.md`, `DECISIONS.md`, `AGENTS.md`, `.claude/settings.json`. A fresh `pnpm cicheck` before commit is MANDATORY. That run may again drop the fork content in the two generated files (P-014) — verify and restore them before staging.
- E2E matrix, full: **28 spec files / 1538 tests passed**, exit 0 (`e2e-full.txt`), including `e2e-mcp.spec.ts` (codearts-ide) and `e2e-trae-home.spec.ts` (CN-first).
- Generated-artifact drift: none (index == worktree for the three artifacts after re-generation; `git diff --exit-code` clean in cicheck-4).
- Q12 assertion: passes (part of the 17062).
- After the final `DECISIONS.md` edits, `pnpm cspell` re-run: 0 issues.

## Next steps (resume in a new session)

1. Read `HANDOFF.md` -> `DECISIONS.md` (D-015..D-018, P-011..P-014) -> `CONTEXT.md` -> `AGENTS.md`.
2. Run `pnpm cicheck` once more (MANDATORY before commit; HANDOFF Next steps 8 / session agreement). It may re-trigger `pnpm generate` and drop fork-only content from `AGENTS.md` and `.claude/settings.json` (P-014) — check both afterwards. If cspell reports a new word, add it to the corresponding file's ignore comment.
3. After cicheck is green, **verify and, if needed, restore** `AGENTS.md` (43.9.0 text + `Fork Workflow` / `Session Handoff` sections) and `.claude/settings.json` (`UserPromptSubmit` -> `codegraph prompt-hook`). References: `git show :0:AGENTS.md`, `git show :0:.claude/settings.json`, commit `8ee6e0594`, and `/tmp/codebuddy-backups/20261118-port-session/`. Do NOT run any further `pnpm` command after this restore.
4. Stage everything in one go: the 7 UU files (resolves the conflicts), the 4 untracked files, `HANDOFF.md`, `DECISIONS.md`, `CONTEXT.md`, `AGENTS.md`, `.claude/settings.json`, and any remaining modified source. P-005 is already satisfied for the three generated artifacts.
5. `git commit -m "..."` — single-line message, NO here-doc, NO `--no-verify`. The `vp staged` pre-commit hook runs (does not trigger `generate`); if it reformats staged files, re-check `git status` before finishing.
6. Verify success criteria: `main == upstream/main`; `git merge-base --is-ancestor main dev` (expect exit 0 after the commit); `pnpm cicheck` green; E2E matrix green; no generated-artifact drift; Q12 assertion passes; `origin/main`/`origin/dev` unchanged.
7. `git switch feat/codearts-ide`. Do NOT push `main` or `dev` (Q13=A) without separate authorization.
8. Deferred (B1 / 3A / P-013): local package/install verification (would need `rulesync.jsonc` activation of local targets + symlink audit, P-002); D-014/P-010 numbering reconciliation and the two handoff-document versions when `feat/codearts-ide` is merged.

## Environment facts

- `git config http.proxy` = `socks5h://127.0.0.1:7892`. Fetching a large pack over default HTTP/2 failed (`RPC failed; curl 18 Transferred a partial file`); `git -c http.version=HTTP/1.1 fetch` works. Prefer shell config files over `launchctl setenv` for CLI environment variables.
- `~/.codeartsdoer/installers/bin/codearts` is the CLI binary. The shell also defines a `codearts` function that injects `CODEARTS_CLI_AK` / `CODEARTS_CLI_SK` from Keychain.
- `~/.codeartsdoer/AGENTS.md` is a symlink into the old aggregation repo. Do not write through it without checking the link target.
- CodeArts CLI and the CodeArts Agent IDE share `.codeartsdoer/` for rules, skills, commands and agents; the IDE reads MCP from `.codeartsdoer/mcp/mcp_settings.json`.
- `~/.trae/` is still an empty stub; `~/.trae-cn/` remains the real Trae user config.

## Known issues

- P-005 still applies: `check:docs-content` compares the worktree to the index, so stage documentation changes before running `pnpm cicheck`.
- P-011 through P-014 are in `DECISIONS.md`; read them there. P-014 is the `pnpm generate` side-effect described above.
