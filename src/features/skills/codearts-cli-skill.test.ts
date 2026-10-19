import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CODEARTS_CLI_SKILLS_DIR_PATH } from "../../constants/codearts-cli-paths.js";
import { RULESYNC_SKILLS_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { setupTestDirectory } from "../../test-utils/test-directories.js";
import { CodeartsCliSkill } from "./codearts-cli-skill.js";
import { RulesyncSkill } from "./rulesync-skill.js";

describe("CodeartsCliSkill", () => {
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

  const buildRulesyncSkill = (targets: string[]) =>
    new RulesyncSkill({
      outputRoot: testDir,
      relativeDirPath: RULESYNC_SKILLS_RELATIVE_DIR_PATH,
      dirName: "daily-report",
      frontmatter: {
        name: "daily-report",
        description: "Prepare a daily report from the tracking board",
        targets: targets as never,
        agentsskills: { license: "MIT", "allowed-tools": ["Read"] },
      },
      body: "Summarize my TODO items.",
      validate: true,
    });

  it("should resolve .codeartsdoer/skills in both scopes", () => {
    expect(CodeartsCliSkill.getSettablePaths().relativeDirPath).toBe(CODEARTS_CLI_SKILLS_DIR_PATH);
    expect(CodeartsCliSkill.getSettablePaths({ global: true }).relativeDirPath).toBe(
      CODEARTS_CLI_SKILLS_DIR_PATH,
    );
  });

  it("should write only name and description to the skill frontmatter", () => {
    const skill = CodeartsCliSkill.fromRulesyncSkill({
      outputRoot: testDir,
      rulesyncSkill: buildRulesyncSkill(["*"]),
    });

    expect(skill).toBeInstanceOf(CodeartsCliSkill);
    expect(skill.getFrontmatter()).toEqual({
      name: "daily-report",
      description: "Prepare a daily report from the tracking board",
    });
    expect(skill.getBody()).toBe("Summarize my TODO items.");
  });

  it("should be targeted by codearts-cli and wildcard skills only", () => {
    expect(CodeartsCliSkill.isTargetedByRulesyncSkill(buildRulesyncSkill(["codearts-cli"]))).toBe(
      true,
    );
    expect(CodeartsCliSkill.isTargetedByRulesyncSkill(buildRulesyncSkill(["*"]))).toBe(true);
    expect(CodeartsCliSkill.isTargetedByRulesyncSkill(buildRulesyncSkill(["cursor"]))).toBe(false);
  });
});
