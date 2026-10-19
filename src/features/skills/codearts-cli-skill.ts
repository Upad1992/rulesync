import { CODEARTS_CLI_SKILLS_DIR_PATH } from "../../constants/codearts-cli-paths.js";
import { AgentsSkillsSkill } from "./agentsskills-skill.js";
import { RulesyncSkill } from "./rulesync-skill.js";
import { ToolSkillFromRulesyncSkillParams, ToolSkillSettablePaths } from "./tool-skill.js";

/**
 * Skills for CodeArts CLI.
 *
 * CodeArts reads `SKILL.md` from `.codeartsdoer/skills/<name>/` (project) and
 * `~/.codeartsdoer/skills/` (user). Its loader only keeps `name` and
 * `description` from the frontmatter and ignores every other key, so this
 * target writes exactly those two fields and ships the supporting files
 * (`scripts/`, `references/`, `assets/`) unchanged.
 *
 * @see https://support.huaweicloud.com/usermanual-cli/codeartsagent_cli_0019.html
 */
export class CodeartsCliSkill extends AgentsSkillsSkill {
  static override getSettablePaths(
    _options: {
      global?: boolean;
    } = {},
  ): ToolSkillSettablePaths {
    return { relativeDirPath: CODEARTS_CLI_SKILLS_DIR_PATH };
  }

  static override isTargetedByRulesyncSkill(rulesyncSkill: RulesyncSkill): boolean {
    const targets = rulesyncSkill.getFrontmatter().targets;
    return targets.includes("*") || targets.includes("codearts-cli");
  }

  static override fromRulesyncSkill({
    outputRoot = process.cwd(),
    rulesyncSkill,
    validate = true,
    global = false,
  }: ToolSkillFromRulesyncSkillParams): CodeartsCliSkill {
    const frontmatter = rulesyncSkill.getFrontmatter();

    return new this({
      outputRoot,
      relativeDirPath: this.getSettablePaths({ global }).relativeDirPath,
      dirName: rulesyncSkill.getDirName(),
      frontmatter: {
        name: frontmatter.name,
        description: frontmatter.description,
      },
      body: rulesyncSkill.getBody(),
      otherFiles: rulesyncSkill.getOtherFiles(),
      validate,
      global,
    });
  }
}
