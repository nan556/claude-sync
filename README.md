# Claude Code Sync

跨设备同步 Claude Code 配置的脚本工具。

## 功能

- 将 `.claude` 配置目录同步到 Git 远程仓库
- 自动管理 session 文件（只保留最近的 N 个）
- 多设备间同步 Claude Code 配置和会话历史

## 快速开始

### 1. 克隆仓库

```bash
git clone git@github.com:nan556/claude-sync.git ~/.claude
cd ~/.claude
```

### 2. 配置

编辑 `sync.conf`：

```bash
KEEP_SESSIONS=3   # 每个项目保留的 session 文件数量
```

### 3. 手动同步

```bash
# 同步到远程
./sync.sh

# 显示详细输出
./sync.sh --verbose
```

## 自动化

### cron 定时任务（推荐）

```bash
# 每小时自动同步
0 * * * * ~/.claude/sync.sh

# 每天凌晨2点同步
0 2 * * * ~/.claude/sync.sh
```

### Git hooks 自动推送

在 `.git/hooks/post-commit` 添加：

```bash
#!/bin/bash
~/.claude/sync.sh
```

## 工作原理

1. `git pull` — 拉取远程更新，解决合并冲突（优先保留本地）
2. 扫描 `projects/*/` 目录下的 `.jsonl` session 文件
3. 每个项目目录只保留最近 N 个 session 文件
4. `git add` — 暂存变更
5. `git commit` + `git push` — 推送到远程

## 注意事项

- session 文件按修改时间排序，保留最新的 N 个
- 较旧的 session 文件从 git 索引移除（本地文件仍保留）
- 首次使用建议先手动运行 `./sync.sh --verbose` 确认无误

## 项目结构

```
~/.claude/
├── sync.sh        # 同步主脚本
├── sync.conf      # 配置文件
├── projects/      # Claude Code 项目会话
├── sessions/      # 全局会话记录
├── skills/        # 自定义技能
├── plugins/       # 插件配置
└── settings.json  # Claude Code 设置
```

