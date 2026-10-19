import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH } from "../../constants/rulesync-paths.js";
import { createMockLogger } from "../../test-utils/mock-logger.js";
import { setupTestDirectory } from "../../test-utils/test-directories.js";
import { ensureDir, writeFileContent } from "../../utils/file.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { RulesyncSubagent } from "./rulesync-subagent.js";
import { SubagentsProcessor, toolSubagentFactories } from "./subagents-processor.js";
import type { ToolSubagentFromRulesyncSubagentParams } from "./tool-subagent.js";
import { TraeSubagent } from "./trae-subagent.js";

const { getHomeDirectoryMock } = vi.hoisted(() => {
  return {
    getHomeDirectoryMock: vi.fn(),
  };
});
vi.mock("../../utils/file.js", async () => {
  const actual = await vi.importActual<typeof import("../../utils/file.js")>("../../utils/file.js");
  return {
    ...actual,
    getHomeDirectory: getHomeDirectoryMock,
  };
});

const buildRulesyncSubagent = ({
  frontmatter,
  body = "Review the code.",
}: {
  frontmatter: ConstructorParameters<typeof RulesyncSubagent>[0]["frontmatter"];
  body?: string;
}): RulesyncSubagent =>
  new RulesyncSubagent({
    outputRoot: ".",
    relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
    relativeFilePath: "reviewer.md",
    frontmatter,
    body,
    validate: true,
  });

const fromRulesync = (
  params: Omit<ToolSubagentFromRulesyncSubagentParams, "relativeDirPath">,
): TraeSubagent =>
  TraeSubagent.fromRulesyncSubagent({
    relativeDirPath: RULESYNC_SUBAGENTS_RELATIVE_DIR_PATH,
    ...params,
  }) as TraeSubagent;

describe("TraeSubagent", () => {
  let testDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const setup = await setupTestDirectory({ home: true });
    testDir = setup.testDir;
    cleanup = setup.cleanup;
    vi.spyOn(process, "cwd").mockReturnValue(testDir);
    getHomeDirectoryMock.mockReturnValue(testDir);
  });

  afterEach(async () => {
    await cleanup();
    vi.restoreAllMocks();
    getHomeDirectoryMock.mockReset();
  });

  describe("getSettablePaths", () => {
    it("should use .trae/agents for the project scope", () => {
      expect(TraeSubagent.getSettablePaths()).toEqual({
        relativeDirPath: join(".trae", "agents"),
      });
    });

    it("should fall back to ~/.trae/agents when ~/.trae-cn does not exist", () => {
      expect(TraeSubagent.getSettablePaths({ global: true })).toEqual({
        relativeDirPath: join(".trae", "agents"),
      });
    });

    it("should prefer ~/.trae-cn/agents when it exists", async () => {
      await ensureDir(join(testDir, ".trae-cn"));

      expect(TraeSubagent.getSettablePaths({ global: true })).toEqual({
        relativeDirPath: join(".trae-cn", "agents"),
      });
    });
  });

  describe("scope registration", () => {
    it("should be offered for both project and global mode", () => {
      expect(toolSubagentFactories.get("trae")?.meta).toEqual({
        supportsProject: true,
        supportsSimulated: false,
        supportsGlobal: true,
        filePattern: "*.md",
      });
      expect(SubagentsProcessor.getToolTargets()).toContain("trae");
      expect(SubagentsProcessor.getToolTargets({ global: true })).toContain("trae");
    });
  });

  describe("fromRulesyncSubagent", () => {
    it("should map name/description and Trae-specific fields", () => {
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "reviewer",
          description: "Reviews code",
          trae: {
            model: "glm-5.2",
            tools: "Read, Grep",
            disallowedTools: "Bash",
            mcpServers: ["GitHub"],
          },
        },
      });

      const subagent = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
      }) as TraeSubagent;

      expect(subagent).toBeInstanceOf(TraeSubagent);
      expect(subagent.getFrontmatter()).toEqual({
        name: "reviewer",
        description: "Reviews code",
        model: "glm-5.2",
        tools: "Read, Grep",
        disallowedTools: "Bash",
        mcpServers: ["GitHub"],
      });
      expect(subagent.getRelativeDirPath()).toBe(join(".trae", "agents"));
      expect(subagent.getBody()).toBe("Review the code.");

      const parsed = parseFrontmatter(subagent.getFileContent(), "reviewer.md");
      expect(parsed.frontmatter).toEqual({
        name: "reviewer",
        description: "Reviews code",
        model: "glm-5.2",
        tools: "Read, Grep",
        disallowedTools: "Bash",
        mcpServers: ["GitHub"],
      });
      expect(parsed.body.trim()).toBe("Review the code.");
    });

    it("should preserve an empty tools string", () => {
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "reviewer",
          description: "Reviews code",
          trae: { tools: "" },
        },
      });

      const subagent = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
      }) as TraeSubagent;

      expect(subagent.getFrontmatter().tools).toBe("");
      expect(parseFrontmatter(subagent.getFileContent(), "reviewer.md").frontmatter.tools).toBe("");
    });

    it("should drop unsupported keys with a warning", () => {
      const logger = createMockLogger();
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "reviewer",
          description: "Reviews code",
          trae: {
            model: "glm-5.2",
            hooks: { PreToolUse: [] },
            color: "red",
          },
        },
      });

      const subagent = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
        logger,
      }) as TraeSubagent;

      expect(subagent.getFrontmatter()).toEqual({
        name: "reviewer",
        description: "Reviews code",
        model: "glm-5.2",
      });
      expect(subagent.getFileContent()).not.toContain("hooks");
      expect(subagent.getFileContent()).not.toContain("color");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Dropping unsupported field.*hooks.*color/),
      );
    });

    it("should fall back to the name when description is missing", () => {
      const logger = createMockLogger();
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "reviewer",
        },
      });

      const subagent = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
        logger,
      }) as TraeSubagent;

      expect(subagent.getFrontmatter().description).toBe("reviewer");
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("requires a description"));
    });

    it("should treat a whitespace-only description as missing", () => {
      const logger = createMockLogger();
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "reviewer",
          description: "   ",
        },
      });

      const subagent = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
        logger,
      }) as TraeSubagent;

      expect(subagent.getFrontmatter().description).toBe("reviewer");
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("requires a description"));
    });

    it("should warn about a name Trae will reject", () => {
      const logger = createMockLogger();
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "1bad",
          description: "Reviews code",
        },
      });

      const subagent = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
        logger,
      }) as TraeSubagent;

      expect(subagent.getFrontmatter().name).toBe("1bad");
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("may reject"));
    });

    it("should not warn about a valid name", () => {
      const logger = createMockLogger();
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "code-reviewer",
          description: "Reviews code",
        },
      });

      fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
        logger,
      });

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should use the user-level directory in global mode", async () => {
      await ensureDir(join(testDir, ".trae-cn"));
      const rulesyncSubagent = buildRulesyncSubagent({
        frontmatter: {
          targets: ["trae"],
          name: "reviewer",
          description: "Reviews code",
        },
      });

      const subagent = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
        global: true,
      }) as TraeSubagent;

      expect(subagent.getRelativeDirPath()).toBe(join(".trae-cn", "agents"));
    });
  });

  describe("toRulesyncSubagent", () => {
    it("should round-trip every supported field through the trae section", async () => {
      await writeFileContent(
        join(testDir, ".trae", "agents", "reviewer.md"),
        [
          "---",
          "name: reviewer",
          "description: Reviews code",
          "model: glm-5.2",
          "tools: Read, Grep",
          "disallowedTools: Bash",
          "mcpServers:",
          "  - GitHub",
          "---",
          "Review the code.",
        ].join("\n"),
      );

      const subagent = await TraeSubagent.fromFile({
        outputRoot: testDir,
        relativeFilePath: "reviewer.md",
      });

      const rulesyncSubagent = subagent.toRulesyncSubagent();
      expect(rulesyncSubagent.getFrontmatter()).toEqual({
        targets: ["*"],
        name: "reviewer",
        description: "Reviews code",
        trae: {
          model: "glm-5.2",
          tools: "Read, Grep",
          disallowedTools: "Bash",
          mcpServers: ["GitHub"],
        },
      });
      expect(rulesyncSubagent.getBody()).toBe("Review the code.");

      const regenerated = fromRulesync({
        outputRoot: testDir,
        rulesyncSubagent,
      });

      expect(regenerated.getFrontmatter()).toEqual(subagent.getFrontmatter());
      expect(regenerated.getBody()).toBe(subagent.getBody());
    });
  });

  describe("fromFile", () => {
    it("should read a user-level file from the CN directory", async () => {
      await ensureDir(join(testDir, ".trae-cn", "agents"));
      await writeFileContent(
        join(testDir, ".trae-cn", "agents", "reviewer.md"),
        ["---", "name: reviewer", "description: Reviews code", "---", "Review the code."].join(
          "\n",
        ),
      );

      const subagent = await TraeSubagent.fromFile({
        outputRoot: testDir,
        relativeFilePath: "reviewer.md",
        global: true,
      });

      expect(subagent.getRelativeDirPath()).toBe(join(".trae-cn", "agents"));
      expect(subagent.getFrontmatter()).toEqual({
        name: "reviewer",
        description: "Reviews code",
      });
    });

    it("should reject a file without a description", async () => {
      await writeFileContent(
        join(testDir, ".trae", "agents", "reviewer.md"),
        ["---", "name: reviewer", "---", "Review the code."].join("\n"),
      );

      await expect(
        TraeSubagent.fromFile({
          outputRoot: testDir,
          relativeFilePath: "reviewer.md",
        }),
      ).rejects.toThrow(/Invalid frontmatter/);
    });
  });

  describe("isTargetedByRulesyncSubagent", () => {
    it("should respect explicit and wildcard targets", () => {
      expect(
        TraeSubagent.isTargetedByRulesyncSubagent(
          buildRulesyncSubagent({
            frontmatter: { targets: ["trae"], name: "planner", description: "Plans" },
          }),
        ),
      ).toBe(true);
      expect(
        TraeSubagent.isTargetedByRulesyncSubagent(
          buildRulesyncSubagent({
            frontmatter: { targets: ["*"], name: "planner", description: "Plans" },
          }),
        ),
      ).toBe(true);
      expect(
        TraeSubagent.isTargetedByRulesyncSubagent(
          buildRulesyncSubagent({
            frontmatter: { targets: ["claudecode"], name: "planner", description: "Plans" },
          }),
        ),
      ).toBe(false);
    });
  });

  describe("forDeletion", () => {
    it("should create a minimal instance without reading the file", () => {
      const subagent = TraeSubagent.forDeletion({
        outputRoot: testDir,
        relativeDirPath: join(".trae", "agents"),
        relativeFilePath: "gone.md",
      });

      expect(subagent.getFrontmatter()).toEqual({ name: "", description: "" });
      expect(subagent.getFileContent()).toBe("");
    });
  });
});
