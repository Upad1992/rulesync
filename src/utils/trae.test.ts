import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDirectory } from "../test-utils/test-directories.js";
import { ensureDir } from "./file.js";
import { getTraeCommandsDirPath, getTraeSkillsDirPath, getTraeUserDir } from "./trae.js";

describe("Trae user paths", () => {
  let testDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ testDir, cleanup } = await setupTestDirectory({ home: true }));
    vi.stubEnv("HOME_DIR", testDir);
  });

  afterEach(async () => {
    await cleanup();
    vi.unstubAllEnvs();
  });

  it("should fall back to .trae when the Trae CN user directory is absent", () => {
    expect(getTraeUserDir()).toBe(".trae");
    expect(getTraeSkillsDirPath({ global: true })).toBe(join(".trae", "skills"));
    expect(getTraeCommandsDirPath({ global: true })).toBe(join(".trae", "commands"));
  });

  it("should prefer .trae-cn for global scope when the Trae CN user directory exists", async () => {
    await ensureDir(join(testDir, ".trae-cn"));

    expect(getTraeUserDir()).toBe(".trae-cn");
    expect(getTraeSkillsDirPath({ global: true })).toBe(join(".trae-cn", "skills"));
    expect(getTraeCommandsDirPath({ global: true })).toBe(join(".trae-cn", "commands"));
  });

  it("should keep the project-level .trae paths regardless of the user directory", async () => {
    await ensureDir(join(testDir, ".trae-cn"));

    expect(getTraeSkillsDirPath({ global: false })).toBe(join(".trae", "skills"));
    expect(getTraeCommandsDirPath({ global: false })).toBe(join(".trae", "commands"));
  });
});
