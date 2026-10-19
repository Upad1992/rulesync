import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CODEARTS_CLI_COMMANDS_DIR_PATH } from "../../constants/codearts-cli-paths.js";
import { RULESYNC_COMMANDS_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { setupTestDirectory } from "../../test-utils/test-directories.js";
import { CodeartsCliCommand } from "./codearts-cli-command.js";
import { RulesyncCommand } from "./rulesync-command.js";

describe("CodeartsCliCommand", () => {
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

  const buildRulesyncCommand = ({
    targets = ["*"],
    section = {},
  }: {
    targets?: string[];
    section?: Record<string, unknown>;
  } = {}) =>
    new RulesyncCommand({
      relativeDirPath: RULESYNC_COMMANDS_RELATIVE_DIR_PATH,
      relativeFilePath: "review.md",
      frontmatter: {
        targets: targets as never,
        description: "Review the current diff",
        ...(Object.keys(section).length > 0 && { "codearts-cli": section }),
      },
      body: "Review the diff and list the risks.",
      fileContent: "",
    });

  it("should resolve .codeartsdoer/commands in both scopes", () => {
    expect(CodeartsCliCommand.getSettablePaths().relativeDirPath).toBe(
      CODEARTS_CLI_COMMANDS_DIR_PATH,
    );
    expect(CodeartsCliCommand.getSettablePaths({ global: true }).relativeDirPath).toBe(
      CODEARTS_CLI_COMMANDS_DIR_PATH,
    );
  });

  it("should map description and the codearts-cli section onto the file frontmatter", () => {
    const command = CodeartsCliCommand.fromRulesyncCommand({
      outputRoot: testDir,
      rulesyncCommand: buildRulesyncCommand({
        section: { agent: "developer", model: "huaweicloud-maas/GLM-5.2", subtask: true },
      }),
    });

    expect(command.getFrontmatter()).toEqual({
      description: "Review the current diff",
      agent: "developer",
      model: "huaweicloud-maas/GLM-5.2",
      subtask: true,
    });
    expect(command.getBody()).toBe("Review the diff and list the risks.");
  });

  it("should round-trip target-specific fields back into the codearts-cli section", () => {
    const command = CodeartsCliCommand.fromRulesyncCommand({
      outputRoot: testDir,
      rulesyncCommand: buildRulesyncCommand({ section: { subtask: true } }),
    });

    const rulesyncCommand = command.toRulesyncCommand();

    expect(rulesyncCommand.getFrontmatter()).toEqual({
      targets: ["*"],
      description: "Review the current diff",
      "codearts-cli": { subtask: true },
    });
  });

  it("should be targeted by codearts-cli and wildcard commands only", () => {
    expect(
      CodeartsCliCommand.isTargetedByRulesyncCommand(
        buildRulesyncCommand({ targets: ["codearts-cli"] }),
      ),
    ).toBe(true);
    expect(CodeartsCliCommand.isTargetedByRulesyncCommand(buildRulesyncCommand())).toBe(true);
    expect(
      CodeartsCliCommand.isTargetedByRulesyncCommand(buildRulesyncCommand({ targets: ["cursor"] })),
    ).toBe(false);
  });
});
