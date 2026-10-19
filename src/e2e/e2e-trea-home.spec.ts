import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  RULESYNC_COMMANDS_RELATIVE_DIR_PATH,
  RULESYNC_SKILLS_RELATIVE_DIR_PATH,
} from "../constants/rulesync-paths.js";
import { ensureDir, fileExists, readFileContent, writeFileContent } from "../utils/file.js";
import { runGenerate, useGlobalTestDirectories } from "./e2e-helper.js";

const writeSources = async (projectDir: string): Promise<void> => {
  await writeFileContent(
    join(projectDir, RULESYNC_SKILLS_RELATIVE_DIR_PATH, "generated-skill", "SKILL.md"),
    [
      "---",
      "name: generated-skill",
      'description: "Generated skill"',
      'targets: ["*"]',
      "---",
      "Generated Trae skill.",
    ].join("\n"),
  );
  await writeFileContent(
    join(projectDir, RULESYNC_COMMANDS_RELATIVE_DIR_PATH, "generated-command.md"),
    [
      "---",
      'targets: ["*"]',
      'description: "Generated command"',
      "---",
      "Generated Trae command.",
    ].join("\n"),
  );
};

describe("E2E: Trae CN user directory", () => {
  const { getProjectDir, getHomeDir } = useGlobalTestDirectories();

  it("should write global skills and commands under ~/.trae-cn when it exists", async () => {
    const projectDir = getProjectDir();
    const homeDir = getHomeDir();
    await ensureDir(join(homeDir, ".trae-cn"));
    await writeSources(projectDir);

    await runGenerate({
      target: "trae",
      features: "skills,commands",
      global: true,
      env: { HOME_DIR: homeDir },
    });

    expect(
      await readFileContent(join(homeDir, ".trae-cn", "skills", "generated-skill", "SKILL.md")),
    ).toContain("Generated Trae skill");
    expect(
      await readFileContent(join(homeDir, ".trae-cn", "commands", "generated-command.md")),
    ).toContain("Generated Trae command");
    expect(await fileExists(join(homeDir, ".trae", "skills"))).toBe(false);
    expect(await fileExists(join(homeDir, ".trae", "commands"))).toBe(false);
  });

  it("should fall back to ~/.trae when ~/.trae-cn does not exist", async () => {
    const projectDir = getProjectDir();
    const homeDir = getHomeDir();
    await writeSources(projectDir);

    await runGenerate({
      target: "trae",
      features: "skills,commands",
      global: true,
      env: { HOME_DIR: homeDir },
    });

    expect(
      await readFileContent(join(homeDir, ".trae", "skills", "generated-skill", "SKILL.md")),
    ).toContain("Generated Trae skill");
    expect(
      await readFileContent(join(homeDir, ".trae", "commands", "generated-command.md")),
    ).toContain("Generated Trae command");
    expect(await fileExists(join(homeDir, ".trae-cn"))).toBe(false);
  });
});
