import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CODEARTS_CLI_DIR,
  CODEARTS_CLI_RULE_FILE_NAME,
} from "../../constants/codearts-cli-paths.js";
import { RULESYNC_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { setupTestDirectory } from "../../test-utils/test-directories.js";
import { writeFileContent } from "../../utils/file.js";
import { CodeartsCliRule } from "./codearts-cli-rule.js";
import { RulesyncRule } from "./rulesync-rule.js";

describe("CodeartsCliRule", () => {
  let testDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ testDir, cleanup } = await setupTestDirectory());
    vi.spyOn(process, "cwd").mockReturnValue(testDir);
  });

  afterEach(async () => {
    await cleanup();
    vi.restoreAllMocks();
  });

  const buildRulesyncRule = ({ root, targets = ["*"] }: { root: boolean; targets?: string[] }) =>
    new RulesyncRule({
      relativeDirPath: RULESYNC_RELATIVE_DIR_PATH,
      relativeFilePath: root ? "overview.md" : "coding-style.md",
      frontmatter: { root, targets: targets as never },
      body: "# Rule",
    });

  it("should resolve the project root AGENTS.md and the user-level file", () => {
    expect(CodeartsCliRule.getSettablePaths()).toEqual({
      root: {
        relativeDirPath: ".",
        relativeFilePath: CODEARTS_CLI_RULE_FILE_NAME,
      },
    });
    expect(CodeartsCliRule.getSettablePaths({ global: true })).toEqual({
      root: {
        relativeDirPath: CODEARTS_CLI_DIR,
        relativeFilePath: CODEARTS_CLI_RULE_FILE_NAME,
      },
    });
  });

  it("should fold non-root rules into the project root file", () => {
    const toolRule = CodeartsCliRule.fromRulesyncRule({
      rulesyncRule: buildRulesyncRule({ root: false }),
    });

    expect(toolRule.getRelativeDirPath()).toBe(".");
    expect(toolRule.getRelativeFilePath()).toBe(CODEARTS_CLI_RULE_FILE_NAME);
    expect(toolRule.isRoot()).toBe(false);
    expect(toolRule.getFileContent()).toBe("# Rule");
  });

  it("should write the global rule under ~/.codeartsdoer", () => {
    const toolRule = CodeartsCliRule.fromRulesyncRule({
      rulesyncRule: buildRulesyncRule({ root: true }),
      global: true,
    });

    expect(toolRule.getRelativeDirPath()).toBe(join(".codeartsdoer"));
    expect(toolRule.getRelativeFilePath()).toBe(CODEARTS_CLI_RULE_FILE_NAME);
    expect(toolRule.isRoot()).toBe(true);
  });

  it("should be targeted by codearts-cli and wildcard rules only", () => {
    expect(
      CodeartsCliRule.isTargetedByRulesyncRule(
        buildRulesyncRule({ root: true, targets: ["codearts-cli"] }),
      ),
    ).toBe(true);
    expect(
      CodeartsCliRule.isTargetedByRulesyncRule(buildRulesyncRule({ root: true, targets: ["*"] })),
    ).toBe(true);
    expect(
      CodeartsCliRule.isTargetedByRulesyncRule(
        buildRulesyncRule({ root: true, targets: ["cursor"] }),
      ),
    ).toBe(false);
  });

  it("should read the project root AGENTS.md", async () => {
    await writeFileContent(join(testDir, CODEARTS_CLI_RULE_FILE_NAME), "# Project instructions\n");

    const toolRule = await CodeartsCliRule.fromFile({
      outputRoot: testDir,
      relativeFilePath: CODEARTS_CLI_RULE_FILE_NAME,
    });

    expect(toolRule.isRoot()).toBe(true);
    expect(toolRule.getFileContent()).toBe("# Project instructions\n");
  });
});
