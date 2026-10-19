import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  TRAE_CN_USER_DIR,
  TRAE_COMMANDS_DIR_NAME,
  TRAE_COMMANDS_DIR_PATH,
  TRAE_DIR,
  TRAE_SKILLS_DIR_NAME,
  TRAE_SKILLS_DIR_PATH,
} from "../constants/trae-paths.js";
import { getHomeDirectory } from "./file.js";

/**
 * Trae and Trae CN share the project-level `.trae/` tree but keep separate
 * user-level roots (`~/.trae/` and `~/.trae-cn/`). Prefer the CN root when it
 * exists: a CN installation may leave the international directory behind as a
 * stub, so the international directory cannot be the deciding signal.
 */
export function getTraeUserDir(): string {
  return existsSync(join(getHomeDirectory(), TRAE_CN_USER_DIR)) ? TRAE_CN_USER_DIR : TRAE_DIR;
}

export function getTraeSkillsDirPath({ global }: { global: boolean }): string {
  return global ? join(getTraeUserDir(), TRAE_SKILLS_DIR_NAME) : TRAE_SKILLS_DIR_PATH;
}

export function getTraeCommandsDirPath({ global }: { global: boolean }): string {
  return global ? join(getTraeUserDir(), TRAE_COMMANDS_DIR_NAME) : TRAE_COMMANDS_DIR_PATH;
}
