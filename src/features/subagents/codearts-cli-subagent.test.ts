import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CODEARTS_CLI_AGENTS_DIR_PATH } from "../../constants/codearts-cli-paths.js";
import { RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { setupTestDirectory } from "../../test-utils/test-directories.js";
import { CodeartsCliSubagent } from "./codearts-cli-subagent.js";
import { RulesyncSubagent } from "./rulesync-subagent.js";

describe("CodeartsCliSubagent", () => {
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

  const buildRulesyncSubagent = ({
    targets = ["*"],
    section = {},
    description = "Reviews pull requests",
  }: {
    targets?: string[];
    section?: Record<string, unknown>;
    description?: string;
  } = {}) =>
    new RulesyncSubagent({
      relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
      relativeFilePath: "reviewer.md",
      frontmatter: {
        targets: targets as never,
        name: "reviewer",
        description,
        ...(Object.keys(section).length > 0 && { "codearts-cli": section }),
      },
      body: "Review the diff.",
    });

  it("should resolve .codeartsdoer/agents in both scopes", () => {
    expect(CodeartsCliSubagent.getSettablePaths().relativeDirPath).toBe(
      CODEARTS_CLI_AGENTS_DIR_PATH,
    );
    expect(CodeartsCliSubagent.getSettablePaths({ global: true }).relativeDirPath).toBe(
      CODEARTS_CLI_AGENTS_DIR_PATH,
    );
  });

  it("should default mode to subagent and pass the tools map through", () => {
    const subagent = CodeartsCliSubagent.fromRulesyncSubagent({
      outputRoot: testDir,
      relativeDirPath: CODEARTS_CLI_AGENTS_DIR_PATH,
      rulesyncSubagent: buildRulesyncSubagent({
        section: { tools: { "*": false, read: true }, model: "huaweicloud-maas/GLM-5.2" },
      }),
    });

    expect(subagent.getFrontmatter()).toEqual({
      name: "reviewer",
      description: "Reviews pull requests",
      mode: "subagent",
      tools: { "*": false, read: true },
      model: "huaweicloud-maas/GLM-5.2",
    });
  });

  it("should fall back to the name when the description is missing", () => {
    const subagent = CodeartsCliSubagent.fromRulesyncSubagent({
      outputRoot: testDir,
      relativeDirPath: CODEARTS_CLI_AGENTS_DIR_PATH,
      rulesyncSubagent: buildRulesyncSubagent({ description: "  " }),
    });

    expect(subagent.getFrontmatter().description).toBe("reviewer");
  });

  it("should be targeted by codearts-cli and wildcard subagents only", () => {
    expect(
      CodeartsCliSubagent.isTargetedByRulesyncSubagent(
        buildRulesyncSubagent({ targets: ["codearts-cli"] }),
      ),
    ).toBe(true);
    expect(CodeartsCliSubagent.isTargetedByRulesyncSubagent(buildRulesyncSubagent())).toBe(true);
    expect(
      CodeartsCliSubagent.isTargetedByRulesyncSubagent(
        buildRulesyncSubagent({ targets: ["cursor"] }),
      ),
    ).toBe(false);
  });
});
