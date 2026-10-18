# rulesync Trae CN（国内版）适配实施文档

> 本文档指导如何在 fork 的 rulesync 仓库中添加对 Trae 国内版（`~/.trae-cn/`）的支持。
> 适用版本：rulesync 36.x
> 作者：基于 2026-10-18 实测整理

---

## 1. 背景与动机

### 1.1 问题是什么

rulesync 是一个统一管理多 AI 平台（Claude Code、CodeBuddy、ZCode、Trae 等）配置的 CLI 工具，通过 `rulesync generate` 把 skills、rules、MCP、sub-agents 等资源**以 copy 方式**分发到各平台的配置目录。

但 rulesync 对 Trae 的用户级（global）配置路径硬编码为国际版路径 `~/.trae/`，而国内用户安装的 Trae CN 实际读取的是 `~/.trae-cn/`。这导致：

- `rulesync generate --targets trae --global` 写入 `~/.trae/skills/`
- 但 Trae CN 读的是 `~/.trae-cn/skills/`
- 结果：生成的 skills/rules/MCP 配置 Trae CN 完全读不到

### 1.2 为什么 rulesync 不支持修改 Trae 路径

rulesync 有一个 "Tool home overrides" 机制，允许通过环境变量覆盖某些工具的 home 路径，但**只支持 3 个工具**：

| 工具 | 环境变量 |
|------|---------|
| Hermes Agent | `HERMES_HOME` |
| Kimi Code | `KIMI_CODE_HOME` |
| deepagents-cli | `DEEPAGENTS_HOME` |

Trae 不在其中。原因是：这 3 个工具本身就支持通过环境变量自定义配置目录，rulesync 只是跟随了它们的约定。而 Trae 的配置路径是固定的（国际版 `~/.trae/`，国内版 `~/.trae-cn/`），不支持环境变量覆盖，所以 rulesync 也没有提供 override 入口。

### 1.3 为什么不直接用项目级

Trae 的项目级配置（`./.trae/`）是国际版和国内版都支持的，rulesync 也能正确生成。但项目级配置只能在单个项目内生效，无法实现"一套 skills 跨所有项目共享"的需求。对于主要用 CodeBuddy、偶尔在个别项目用 Trae 的场景，项目级够用；但如果想让 Trae 也能用到全局 skills，就必须支持用户级路径。

### 1.4 我们的目标

让 rulesync 的 `trae` target 自动检测用户安装的是国际版还是国内版，写入正确的路径：
- 检测到 `~/.trae-cn/` → 写入国内版路径
- 否则 → 写入国际版路径 `~/.trae/`（保持原有行为）

---

## 2. 方案选择

### 2.1 方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A：新增 `traecn` target** | 复制 `trae` 的所有 feature 实现，改路径为 `~/.trae-cn/` | 隔离干净，不影响原有 `trae` | 代码重复（10+ 文件），上游更新时 merge 冲突多 |
| **B：`trae` target 自动检测**（推荐） | 在 `trae` 的路径解析逻辑里加检测：有 `~/.trae-cn/` 用国内版，否则用国际版 | 代码改动小（4-5 个文件），无重复，上游 merge 容易 | 需要确保检测逻辑不影响国际版用户 |
| C：环境变量 `TRAE_HOME` | 给 rulesync 加 `TRAE_HOME` 环境变量支持 | 用户可控 | Trae 本身不支持这个变量，rulesync 单方面支持会造成"配置了但 Trae 不认"的困惑 |

### 2.2 为什么选方案 B

1. **代码改动最小**：只需修改 `trae` target 的 4-5 个 feature 实现文件的路径解析逻辑，不需要复制整个 target
2. **上游同步友好**：上游更新 `trae` target 时，merge 冲突只发生在路径解析那几行，而不是整个文件
3. **用户零配置**：不需要用户设置环境变量或改配置，自动检测
4. **可提 PR 给上游**：这个功能对所有国内 Trae 用户都有用，上游可能愿意合并

### 2.3 最终效果

- 国内用户：`rulesync generate --targets trae --global` → 写入 `~/.trae-cn/`
- 国际用户：`rulesync generate --targets trae --global` → 写入 `~/.trae/`（行为不变）
- 项目级：始终写入 `./.trae/`（两个版本都读这个路径，不变）

---

## 3. 实施前准备

### 3.1 环境要求

| 工具 | 版本要求 | 用途 |
|------|---------|------|
| Node.js | >= 18 | 运行 rulesync |
| pnpm | 任意 | 包管理（rulesync 用 pnpm） |
| git | 任意 | 版本控制 |

**验证环境**：
```bash
node -v    # 应 >= 18
pnpm -v
git --version
```

### 3.2 Fork rulesync 仓库

1. 打开 https://github.com/dyoshikawa/rulesync
2. 点击右上角 **Fork** 按钮
3. 选择你的 GitHub 账号作为 fork 目标
4. 等待 fork 完成（通常几秒）

**为什么要 fork**：我们需要修改源码并提交到自己的仓库，不能直接改上游。fork 后你有完整的读写权限，可以自由修改，同时保留与上游的连接以便后续同步更新。

### 3.3 Clone 你的 fork 到本地

```bash
# 替换为你的 GitHub 用户名
git clone https://github.com/<你的用户名>/rulesync.git
cd rulesync
```

### 3.4 添加上游 remote

```bash
git remote add upstream https://github.com/dyoshikawa/rulesync.git
```

**为什么要添加上游**：后续 rulesync 上游更新后，你需要把更新合并到你的 fork。添加 `upstream` remote 后可以直接 `git fetch upstream` 拉取上游代码。

**验证 remote**：
```bash
git remote -v
# origin    https://github.com/<你的用户名>/rulesync.git (fetch)
# origin    https://github.com/<你的用户名>/rulesync.git (push)
# upstream  https://github.com/dyoshikawa/rulesync.git (fetch)
# upstream  https://github.com/dyoshikawa/rulesync.git (push)
```

### 3.5 安装依赖

```bash
pnpm install
```

**为什么用 pnpm**：rulesync 项目本身用 pnpm 管理依赖（有 `pnpm-lock.yaml`），用其他包管理器可能导致依赖版本不一致。

### 3.6 验证开发环境可用

```bash
# 用开发模式运行（直接跑 TS 源码，不需要 build）
pnpm dev --version
# 应输出 rulesync 的版本号
```

**为什么用 `pnpm dev` 而不是 build**：开发时用 `pnpm dev` 通过 tsx/esbuild 直接运行 TypeScript 源码，改完代码立刻能测，不需要每次 `pnpm build`。只有发布时才需要 build。

---

## 4. 详细实施步骤

### 步骤 1：了解 rulesync 的 target 架构

**为什么要先了解架构**：修改前需要知道 rulesync 怎么组织各平台的实现，才能找到正确的文件。

rulesync 的每个功能（rules、mcp、commands、skills 等）对每个平台（target）都有一个独立的实现文件，路径格式为：

```
src/features/<feature>/<target>-<feature>.ts
```

例如 Trae 的实现分布在：
- `src/features/rules/trae-rules.ts`
- `src/features/mcp/trae-mcp.ts`
- `src/features/commands/trae-commands.ts`
- `src/features/skills/trae-skills.ts`
- `src/features/hooks/trae-hooks.ts`
- `src/features/permissions/trae-permissions.ts`

每个文件里有一个 `getSettablePaths()` 方法，定义了该功能在项目级和用户级的输出路径。我们的修改就集中在这些路径上。

### 步骤 2：找到所有 Trae 相关文件

```bash
# 列出所有 trae 相关的实现文件
ls src/features/*/trae-*.ts
```

预期输出：
```
src/features/commands/trae-commands.ts
src/features/hooks/trae-hooks.ts
src/features/mcp/trae-mcp.ts
src/features/permissions/trae-permissions.ts
src/features/rules/trae-rules.ts
src/features/skills/trae-skills.ts
```

**为什么要列出所有文件**：确保不遗漏任何需要修改的文件。如果只改了部分，会导致某些功能写入国际版路径，某些写入国内版路径，造成混乱。

### 步骤 3：创建共享的路径检测工具函数

**为什么要创建共享函数**：6 个文件都需要同样的检测逻辑，如果每个文件都写一遍，后续维护困难，且容易遗漏。提取成一个共享函数，6 个文件都调用它。

#### 3.1 创建工具文件

创建 `src/features/trae-home.ts`：

```typescript
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * 检测 Trae 的用户级配置目录。
 *
 * Trae 有两个版本：
 * - 国际版：~/.trae/
 * - 国内版（Trae CN）：~/.trae-cn/
 *
 * 优先检测国内版路径，因为国内用户安装的通常是国内版。
 * 如果国内版路径不存在，回退到国际版路径，保持原有行为。
 *
 * @returns 用户级 Trae 配置目录的绝对路径
 */
export function getTraeHomeDir(): string {
  const cnPath = join(homedir(), ".trae-cn");
  const intlPath = join(homedir(), ".trae");

  if (existsSync(cnPath)) {
    return cnPath;
  }
  return intlPath;
}
```

**为什么用 `existsSync` 检测**：
- 国内版和国际版可以同时安装（路径不同），所以需要判断用户实际用哪个
- 优先国内版：国内用户安装的一定是国内版，国际版路径可能不存在
- 回退国际版：如果用户只装了国际版，保持原有行为

**为什么不用环境变量**：Trae 本身不支持 `TRAE_HOME` 环境变量，如果 rulesync 单方面支持，会导致用户设置了 `TRAE_HOME=~/.trae-cn` 但 Trae 本身不读这个变量，产生困惑。自动检测更可靠。

#### 3.2 验证工具函数

```bash
# 在 rulesync 目录下运行
node -e "
const { getTraeHomeDir } = require('./src/features/trae-home.ts');
console.log(getTraeHomeDir());
"
```

或者用 tsx：
```bash
pnpm exec tsx -e "
import { getTraeHomeDir } from './src/features/trae-home';
console.log(getTraeHomeDir());
"
```

**预期输出**：
- 如果你装了国内版 Trae：`/Users/<你的用户名>/.trae-cn`
- 如果只装了国际版：`/Users/<你的用户名>/.trae`

**为什么要验证**：确保检测逻辑正确，再去改其他文件。如果这里就错了，后面全错。

### 步骤 4：修改各 feature 的路径解析

对每个 `trae-*.ts` 文件，找到 `getSettablePaths()` 方法，把用户级路径从硬编码的 `~/.trae` 改为调用 `getTraeHomeDir()`。

#### 4.1 修改 `trae-skills.ts`

**修改前**（示例，实际代码可能略有不同）：
```typescript
getSettablePaths(scope) {
  if (scope === "global") {
    return [{ path: join(homedir(), ".trae", "skills", skillName, "SKILL.md") }];
  }
  return [{ path: join(".trae", "skills", skillName, "SKILL.md") }];
}
```

**修改后**：
```typescript
import { getTraeHomeDir } from "../trae-home";

getSettablePaths(scope) {
  if (scope === "global") {
    return [{ path: join(getTraeHomeDir(), "skills", skillName, "SKILL.md") }];
  }
  return [{ path: join(".trae", "skills", skillName, "SKILL.md") }];
}
```

**关键点**：
- 只改 `global` 分支的路径，`project` 分支（`./.trae/`）不变
- 因为项目级路径国际版和国内版都读 `./.trae/`，不需要改

#### 4.2 同理修改其他文件

对以下文件重复相同的修改模式：

| 文件 | 用户级路径（修改前） | 修改后 |
|------|---------------------|--------|
| `trae-rules.ts` | `~/.trae/rules/` | `getTraeHomeDir()/rules/` |
| `trae-mcp.ts` | `~/.trae/mcp.json` | `getTraeHomeDir()/mcp.json` |
| `trae-commands.ts` | `~/.trae/commands/` | `getTraeHomeDir()/commands/` |
| `trae-hooks.ts` | `~/.trae/hooks.json` | `getTraeHomeDir()/hooks.json` |
| `trae-permissions.ts` | `~/.trae/permissions.json` | `getTraeHomeDir()/permissions.json` |

**为什么要逐个文件改**：每个 feature 的路径结构不同（有的是目录，有的是文件），不能简单替换。需要看清楚每个文件的 `getSettablePaths()` 返回什么。

**注意事项**：
- 只改用户级（global）路径，不改项目级（project）路径
- 保持文件其他逻辑不变
- import 语句放在文件顶部

### 步骤 5：更新支持矩阵文档（可选但推荐）

rulesync 有一个自动生成的支持矩阵文档。修改后运行：

```bash
pnpm run generate:tables
```

**为什么要更新**：让文档反映新的行为（虽然功能本身没变，只是路径变了）。这个步骤是可选的，不影响功能。

### 步骤 6：运行测试

```bash
# 运行全部测试
pnpm test

# 或只运行 trae 相关测试
pnpm test -- trae
```

**为什么要跑测试**：rulesync 有完善的测试套件，确保你的修改没有破坏现有功能。如果测试失败，说明你的修改引入了 bug。

**如果测试失败**：
- 检查是否有测试硬编码了 `~/.trae` 路径
- 可能需要 mock `getTraeHomeDir()` 返回固定路径
- 参考其他 target 的测试写法

### 步骤 7：提交代码

```bash
git checkout -b trae-cn-support
git add src/features/trae-home.ts src/features/*/trae-*.ts
git commit -m "feat(trae): auto-detect CN version path (~/.trae-cn)

Trae has two distributions with different config paths:
- International: ~/.trae/
- China (Trae CN): ~/.trae-cn/

Previously rulesync always wrote to ~/.trae/, which Trae CN does
not read. Now getTraeHomeDir() detects which path exists and uses
it, falling back to ~/.trae/ for international users.

Project-scope paths (./.trae/) are unchanged since both versions
read the same project directory."
git push origin trae-cn-support
```

**为什么用特性分支**：
- 隔离你的修改，不影响 main 分支
- 方便后续提 PR 给上游
- 如果出问题可以直接删掉分支重来

---

## 5. 验证步骤

### 5.1 准备测试环境

在 rulesync 仓库外创建一个临时测试目录，避免污染你的真实配置：

```bash
mkdir -p /tmp/rulesync-test && cd /tmp/rulesync-test
```

### 5.2 初始化测试 rulesync 项目

```bash
# 用你修改后的 rulesync 初始化
cd /path/to/your/rulesync && pnpm dev init --cwd /tmp/rulesync-test
```

或者直接在测试目录运行：
```bash
cd /tmp/rulesync-test
node /path/to/your/rulesync/dist/cli/index.js init
```

### 5.3 配置 targets

编辑 `/tmp/rulesync-test/rulesync.jsonc`，设置：
```jsonc
{
  "targets": ["trae"],
  "features": ["rules", "mcp", "skills", "commands"],
  "global": true
}
```

### 5.4 运行 generate 并检查输出路径

```bash
cd /tmp/rulesync-test
/path/to/your/rulesync/node_modules/.bin/tsx /path/to/your/rulesync/src/cli/index.ts generate
```

**检查点**：

| 检查项 | 国内版预期 | 国际版预期 |
|--------|-----------|-----------|
| skills 输出路径 | `~/.trae-cn/skills/` | `~/.trae/skills/` |
| rules 输出路径 | `~/.trae-cn/rules/` | `~/.trae/rules/` |
| mcp 输出路径 | `~/.trae-cn/mcp.json` | `~/.trae/mcp.json` |
| commands 输出路径 | `~/.trae-cn/commands/` | `~/.trae/commands/` |

**验证命令**：
```bash
# 检查国内版路径是否有生成的文件
ls -la ~/.trae-cn/skills/
ls -la ~/.trae-cn/rules/
cat ~/.trae-cn/mcp.json

# 确认国际版路径没有被写入
ls -la ~/.trae/skills/ 2>/dev/null || echo "国际版路径无文件（正确）"
```

### 5.5 验证项目级路径不受影响

```bash
# 改用项目级
cd /tmp/rulesync-test
# 修改 rulesync.jsonc: "global": false
/path/to/your/rulesync/node_modules/.bin/tsx /path/to/your/rulesync/src/cli/index.ts generate

# 检查项目级路径
ls -la .trae/skills/
ls -la .trae/rules/
cat .trae/mcp.json
```

**预期**：项目级始终写入 `./.trae/`，与国内版/国际版无关。

### 5.6 验证回退行为（国际版用户）

如果你只装了国际版 Trae（或临时重命名国内版目录）：

```bash
# 临时重命名国内版目录
mv ~/.trae-cn ~/.trae-cn.bak

# 重新 generate
cd /tmp/rulesync-test
/path/to/your/rulesync/node_modules/.bin/tsx /path/to/your/rulesync/src/cli/index.ts generate

# 检查国际版路径
ls -la ~/.trae/skills/

# 恢复国内版目录
mv ~/.trae-cn.bak ~/.trae-cn
```

**预期**：国内版目录不存在时，回退到国际版路径 `~/.trae/`。

### 5.7 验证其他平台不受影响

确保你的修改只影响 `trae` target，不影响其他平台：

```bash
# 测试其他平台
cd /tmp/rulesync-test
# 修改 rulesync.jsonc: "targets": ["claudecode", "codebuddy", "zcode"]
/path/to/your/rulesync/node_modules/.bin/tsx /path/to/your/rulesync/src/cli/index.ts generate

# 检查各平台路径正确
ls -la ~/.claude/skills/
ls -la ~/.codebuddy/skills/
ls -la ~/.zcode/skills/
```

**预期**：其他平台路径完全不变。

### 5.8 运行完整测试套件

```bash
cd /path/to/your/rulesync
pnpm test
```

**预期**：所有测试通过。如果有测试失败，检查是否有测试硬编码了 `~/.trae` 路径。

---

## 6. 上游同步策略

### 6.1 为什么需要同步上游

rulesync 上游会持续更新（新功能、bug 修复、新平台支持）。你的 fork 需要定期合并上游更新，否则会越来越落后。

### 6.2 同步流程

```bash
# 1. 拉取上游最新代码
git fetch upstream

# 2. 切到你的 main 分支
git checkout main

# 3. 合并上游 main
git merge upstream/main

# 4. 推送到你的 fork
git push origin main
```

### 6.3 处理冲突

如果上游修改了 `trae-*.ts` 文件，可能与你的修改冲突。

**冲突示例**：
```
<<<<<<< HEAD
import { getTraeHomeDir } from "../trae-home";
return [{ path: join(getTraeHomeDir(), "skills", skillName, "SKILL.md") }];
=======
return [{ path: join(homedir(), ".trae", "skills", skillName, "SKILL.md") }];
>>>>>>> upstream/main
```

**解决方法**：
- 保留你的修改（使用 `getTraeHomeDir()`）
- 如果上游改了其他逻辑，把上游的新逻辑和你的路径修改合并
- 解决后 `git add` + `git commit`

**为什么冲突通常很小**：你的修改只涉及路径那一行，上游的修改通常是其他逻辑（如格式转换、新字段支持），冲突范围有限。

### 6.4 同步频率

- **建议**：每月同步一次，或在需要上游新功能时同步
- **不要**：等到落后太多才同步，冲突会更难解决

---

## 7. （可选）提 PR 给上游

如果你愿意把这个功能贡献给上游：

1. 确保代码通过所有测试
2. 确保代码符合 rulesync 的 CONTRIBUTING.md 规范（PR 上限 1000 行，建议 400 行）
3. 在 GitHub 上从你的 `trae-cn-support` 分支提 PR 到 `dyoshikawa/rulesync` 的 `main` 分支
4. PR 描述里说明：
   - 问题：Trae CN 用 `~/.trae-cn/`，rulesync 只写 `~/.trae/`
   - 方案：自动检测路径
   - 影响范围：只影响 `trae` target 的用户级路径，项目级和其他平台不变

**为什么提 PR**：
- 合并后你不需要维护 fork，直接用官方版
- 帮助其他国内 Trae 用户
- rulesync 维护者可能有更好的实现建议

---

## 8. 常见问题

### Q1：如果用户同时装了国际版和国内版怎么办？

**A**：`getTraeHomeDir()` 优先检测国内版路径 `~/.trae-cn/`。如果两个都装了，会用国内版。这是合理的，因为国内用户主要用国内版。如果用户想强制用国际版，可以临时重命名 `~/.trae-cn/`。

### Q2：检测逻辑会影响性能吗？

**A**：`existsSync` 是一个非常快的系统调用（< 1ms），且只在 `getSettablePaths()` 时调用一次，不影响性能。

### Q3：为什么不用 `TRAE_HOME` 环境变量？

**A**：Trae 本身不支持 `TRAE_HOME` 环境变量。如果 rulesync 支持但 Trae 不认，会造成"配置生效了但 Trae 读不到"的困惑。自动检测更可靠。

### Q4：项目级路径为什么不改？

**A**：国际版和国内版的 Trae 都读项目级路径 `./.trae/`，不需要区分。只有用户级路径不同。

### Q5：修改后需要重新 build 吗？

**A**：开发时用 `pnpm dev` 直接跑源码，不需要 build。只有发布到 npm 或全局安装时才需要 `pnpm build`。

### Q6：如果上游已经合并了类似功能怎么办？

**A**：如果上游合并了你的 PR 或其他人实现了类似功能，你可以删除 fork 的修改，直接用官方版。检查方法：`rulesync generate --targets trae --global` 是否写入 `~/.trae-cn/`。

---

## 9. 实施检查清单

- [ ] Node.js >= 18, pnpm, git 已安装
- [ ] 已 fork rulesync 并 clone 到本地
- [ ] 已添加 upstream remote
- [ ] 已运行 `pnpm install`
- [ ] 已创建 `src/features/trae-home.ts` 工具函数
- [ ] 已验证 `getTraeHomeDir()` 返回正确路径
- [ ] 已修改所有 `trae-*.ts` 文件的用户级路径
- [ ] 项目级路径未修改
- [ ] `pnpm test` 全部通过
- [ ] 已验证国内版路径写入正确
- [ ] 已验证国际版回退行为正确
- [ ] 已验证项目级路径不受影响
- [ ] 已验证其他平台不受影响
- [ ] 已提交到特性分支并 push

---

## 附录：rulesync 目录结构参考

```
rulesync/
├── src/
│   ├── features/
│   │   ├── rules/
│   │   │   ├── trae-rules.ts          ← 修改这个
│   │   │   ├── claudecode-rules.ts
│   │   │   └── ...
│   │   ├── mcp/
│   │   │   ├── trae-mcp.ts            ← 修改这个
│   │   │   └── ...
│   │   ├── skills/
│   │   │   ├── trae-skills.ts         ← 修改这个
│   │   │   └── ...
│   │   ├── commands/
│   │   │   ├── trae-commands.ts       ← 修改这个
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── trae-hooks.ts          ← 修改这个
│   │   │   └── ...
│   │   ├── permissions/
│   │   │   ├── trae-permissions.ts    ← 修改这个
│   │   │   └── ...
│   │   └── trae-home.ts               ← 新建这个
│   ├── types/
│   │   ├── tool-target-tuples.ts
│   │   └── tool-display.ts
│   └── cli/
│       └── index.ts
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```
