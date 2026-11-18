# Rulesync Fork

This fork distributes AI coding assistant configuration by copying generated files rather than symlinks. Its vocabulary separates upstream concepts from fork-local ones and distinguishes taking an update from enabling a target.

## Language

**Existing platform**:
A tool target that upstream already supports.
_Avoid_: official tool, supported tool, upstream platform

**Local-only platform**:
A tool target that exists only in this fork, such as `codearts-cli` or `codearts-ide`.
_Avoid_: custom target, new platform, personal target

**Adaptation update**:
An upstream change to an existing platform, including bug fixes, vendor format changes and new features for that platform.
_Avoid_: patch, upstream update, platform update

**Follow up**:
Merge an upstream change into `dev` so generated output contains it. It does not mean merely reviewing or learning about the change.
_Avoid_: track, sync, pull, check

**Partial**:
Selective activation of targets in `rulesync.jsonc`, never a selective set of commits.
_Avoid_: subset, cherry-pick, selective sync
