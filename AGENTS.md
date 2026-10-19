# Rulesync Project Overview

This is Rulesync, a Node.js CLI tool that automatically generates configuration files for various AI coding tools from unified AI rule files. The project enables teams to maintain consistent AI coding assistant rules across multiple tools.

- Read `README.md` and `docs/**/*.md` if you want to know Rulesync specification.
- Manage runtimes and package managers with @mise.toml .
- When you want to check entire codebase:
  - You can use:
    - `pnpm cicheck:code` to check code style, type safety, and tests.
    - `pnpm cicheck:content` to check content style, spelling, and secrets.
    - `pnpm cicheck` to check both code and content.
  - Basically, I recommend you to run `pnpm cicheck` to daily checks.
- When doing `git commit`:
  - You must run `pnpm cicheck` before committing to verify quality.
  - You must not use here documents because it causes a sandbox error.
  - You must not use `--no-verify` option because it skips pre-commit checks and causes serious security issues.
  - When creating a PR, you should include a link in the PR description that associates the PR with its issue.
- About the `skills/` directory at the repository root:
  - This directory contains official skills that are distributed for users to install via the `rulesync fetch` command (e.g., `npx rulesync fetch dyoshikawa/rulesync --features skills`).
  - It is NOT the same as `.rulesync/skills/`, which holds the project's own skill definitions used during generation.
  - Do not modify the root `skills/` directory unless you intend to change the official skills distributed to users.
- The distributed skill `skills/rulesync/` ships only `SKILL.md`, which delegates detailed lookup to the `rulesync docs` CLI command. The bundled documentation itself is embedded from `docs/**/*.md` into `src/generated/docs-content.ts` by `scripts/generate-docs-content.ts` (regenerate with `pnpm run generate:docs-content`; CI fails on drift).
- Always preserve the existence of end-to-end happy-path test cases that cover the Tool × Feature matrix.
- When researching topics, if the built-in webfetch tool cannot retrieve a page's content (e.g., because the page is a SPA), use the `playwright-cli` skill instead.

# Coding Guidelines

- If the arguments are multiple, you should use object as the argument.
  - Not only function arguments, but also class constructor those.
- If you have to write validation logics, please consider using `zod/mini` to do it actively.
  - `zod/mini` is a subset of `zod` to minimize the bundle size.
- To import codes, you should always use static imports. You should not use dynamic imports.
  - Because static imports are easier to analyze and optimize by bundlers such as tree-shaking.
- TypeScript file names should be in kebab-case, even for class implementation files.
- Don't create ballel files. Please always direct import the implementation file.
  - The maintainer thinks that ballel files are harmful to tree-shaking and import path transparency.
- The default value of `outputRoot` should be `process.cwd()` because it is easier to mock in tests compared to hardcoding `"."`. However, the default value of `relativeDirPath` should be `"."` because it should be relative path to concatenate with `outputRoot`.
- When logging errors, you must use `formatError` function in `src/utils/error.ts` to format the error message.
- When writing any filesystem path, you must always use `join` function in `node:path` to join the path because it must support both Windows and Unix-like paths.
- When writing non-filesystem paths (e.g., API paths, gitignore entries, generated file content), use `path.posix.join` or `toPosixPath` from `src/utils/file.ts` to ensure forward slashes regardless of platform.
- When writing Rulesync file paths, you must consider using constants in `src/constants/rulesync-paths.ts` to avoid hardcoding paths.
- You should always use `z.looseObject()` for zod schemas representing frontmatter keys. This is because various AI tools update very quickly and parameters are constantly being added.

# Guidelines for Adding or Modifying Features

- Check whether `rules-processor.ts` needs an updated Additional Convention, especially values within `additionalConvention`. For example, if you remove support for Cursor's Skill feature simulation, remove `skills: { skillClass: CursorSkill }` within convention entry for Cursor.
- Review frontmatter in both rulesync files (`rulesync-{feature}.ts`) and tool files (`{tool}-{feature}.ts`). For overlapping parameters (e.g., `description`), prefer the rulesync value by default, but if the tool file defines the parameter, that tool-specific value takes precedence.
- Gitignore entries are derived from each tool's `getSettablePaths` in `gitignore-derive.ts`, so they update automatically; only add to `HAND_MAINTAINED_GITIGNORE_ENTRIES` in `gitignore-entries.ts` for paths a tool does not emit itself (third-party by-products, shared or global-only trees). Run `pnpm dev gitignore` to update the project `.gitignore`.
- Consider project scope and global scope support. Simulated support should cover project scope only. For native support, implement both project and global scope when the target tool supports them. Consult the tool’s official documentation to decide scope support.
- The `Supported Tools and Features` matrix in `README.md` and `docs/reference/supported-tools.md` is generated from each feature's `getToolTargets` by `scripts/generate-supported-tools-tables.ts` (run `pnpm run generate:tables`; CI fails on drift), so it never needs manual editing — only keep the `Each File Format` prose synchronized by hand.
- Always preserve the existence of end-to-end happy-path test cases that cover the Tool × Feature matrix.

# Testing Guidelines

- Test code files should be placed next to the implementation. This is called the co-location pattern.
  - For example, if the implementation file is `src/a.ts`, the test code file should be `src/a.test.ts`.
- For all test code, to avoid polluting the git managed files, must use the unified pattern of targeting ./tmp/tests/projects/{RANDOM_STRING} as the project directory or ./tmp/tests/home/{RANDOM_STRING} as the pseudo-home directory.
  - To use the unified test directory, you should use the `setupTestDirectory` function from `src/test-utils/test-directories.ts` and mock `process.cwd()` to return the test directory. You must not use `process.chdir()` instead of mocking `process.cwd()` because `process.chdir()` changes the current working directory globally and affects other tests. If you want to test some behavior in global mode, use the pseudo-home directory by `setupTestDirectory({ home: true })` and mock `getHomeDirectory()` to return the pseudo-home directory.

    ```typescript
    // Example with project directory
    describe("Test Name", () => {
      let testDir: string;
      let cleanup: () => Promise<void>;

      beforeEach(async () => {
        ({ testDir, cleanup } = await setupTestDirectory());
        vi.spyOn(process, "cwd").mockReturnValue(testDir);
      });

      afterEach(async () => {
        await cleanup();
      });

      it("Test Case", async () => {
        // Run test using testDir
        await RulesyncRule.fromFile({
          outputRoot: testDir,
          relativeFilePath: "test.md",
        });
        // ...
      });
    });
    ```

    ```typescript
    // Example with pseudo-home directory
    const { getHomeDirectoryMock } = vi.hoisted(() => {
      return {
        getHomeDirectoryMock: vi.fn(),
      };
    });
    vi.mock("../utils/file.js", async () => {
      const actual = await vi.importActual<typeof import("../utils/file.js")>("../utils/file.js");
      return {
        ...actual,
        getHomeDirectory: getHomeDirectoryMock,
      };
    });

    describe("Test Name", () => {
      let testDir: string;
      let cleanup: () => Promise<void>;

      beforeEach(async () => {
        ({ testDir, cleanup } = await setupTestDirectory({ home: true }));
        getHomeDirectoryMock.mockReturnValue(testDir);
      });

      afterEach(async () => {
        await cleanup();
        getHomeDirectoryMock.mockClear();
      });

      it("Test Case", async () => {
        // Run test using testDir
        const subDir = join(testDir, "subdir");
        await ensureDir(subDir);
        // ...
      });
    });
    ```

  - Exceptionally, in E2E testing, you can use process.chdir() to change the current working directory to the test directory because E2E tests are intended to simulate conditions that are as close as possible to real user operations.

- In test, don't change dirs or files out of the project directory even though it's in global mode to make it easier to test some behavior and avoid polluting those.
- `getHomeDirectory()` in `src/utils/file.ts` respects the `HOME_DIR` environment variable regardless of `NODE_ENV`. When `HOME_DIR` is set, it always returns that value. This is used by E2E tests to specify a pseudo-home directory for global mode testing without depending on `NODE_ENV` (which may not be available in compiled binaries).
- When `NODE_ENV` is `test`:
  - All logs by `Logger` in `src/utils/logger.ts` are suppressed.
    - When you want to log in test, use `console.log` and run `npx vitest run --silent=false` to see the logs.
  - `getHomeDirectory()` in `src/utils/file.ts` throws an error if `HOME_DIR` is not set, to enforce explicit mocking.
  - `isEnvTest()` in `src/utils/vitest.ts` is a function that dynamically checks `process.env.NODE_ENV === "test"` at call time. Note: bun compiled binaries may not respect runtime `NODE_ENV` changes, so prefer `HOME_DIR` for E2E tests.

# Fork Workflow

This repository is a fork of `dyoshikawa/rulesync`:

- `main` mirrors `upstream/main` and carries no local feature work. Update it only by fast-forwarding from upstream.
- `dev` is the long-lived personal integration branch and the base for new feature branches.
- Branch new work off `dev` and merge it back into `dev`.
- Bring upstream changes in through `main`, then merge `main` into `dev`; do not rebase `dev`.
