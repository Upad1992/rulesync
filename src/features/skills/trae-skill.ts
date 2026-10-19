import { getTraeSkillsDirPath } from "../../utils/trae.js";
import { AgentsSkillsSkill } from "./agentsskills-skill.js";
import { RulesyncSkill } from "./rulesync-skill.js";
import { ToolSkillSettablePaths } from "./tool-skill.js";

/**
 * Trae skills follow the Agent Skills standard (a `SKILL.md` with `name` and
 * `description` frontmatter, plus optional supporting files), so this target
 * reuses {@link AgentsSkillsSkill} with Trae's locations: `.trae/skills/` in the
 * project and `~/.trae/skills/` for the user (`~/.trae-cn/skills/` on Trae CN).
 *
 * @see https://docs.trae.ai/ide/skills?_lang=en
 */
export class TraeSkill extends AgentsSkillsSkill {
  static override getSettablePaths({
    global = false,
  }: {
    global?: boolean;
  } = {}): ToolSkillSettablePaths {
    return { relativeDirPath: getTraeSkillsDirPath({ global }) };
  }

  static override isTargetedByRulesyncSkill(rulesyncSkill: RulesyncSkill): boolean {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("trae");
  }
}
