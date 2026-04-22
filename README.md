# Claude Code Sync

跨设备同步 Claude Code 配置的脚本工具。

## 功能

- 将 `.claude` 配置目录同步到 Git 远程仓库
- 自动管理 session 文件（只保留最近的 N 个）
- 多设备间同步 Claude Code 配置和会话历史

---

## 新设备安装

### 前提条件

- 已安装 Git
- 已配置 SSH 公钥（用于访问 GitHub）

### 第一步：备份现有配置（如有）

```bash
# 如果已有 .claude 目录，先备份
mv ~/.claude ~/.claude.bak
```

### 第二步：克隆仓库到 ~/.claude

```bash
git clone git@github.com:nan556/claude-sync.git ~/.claude
cd ~/.claude
```

### 第三步：配置 Git 用户（如果需要）

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### 第四步：初始化 git hooks（如需自动同步）

```bash
# 创建 post-commit hook
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
~/.claude/sync.sh
EOF
chmod +x .git/hooks/post-commit
```

### 第五步：首次同步

```bash
# 拉取远程最新配置
git pull

# 手动运行同步确认正常
./sync.sh --verbose
```

---

## 配置说明

### sync.conf

```bash
KEEP_SESSIONS=3   # 每个项目保留的 session 文件数量
```

根据需要调整保留的 session 数量。

---

## 使用方法

### 手动同步

```bash
# 同步到远程
./sync.sh

# 显示详细输出
./sync.sh --verbose
```

### 自动化同步

#### 方式一：cron 定时任务

```bash
# 编辑 crontab
crontab -e

# 添加以下内容（每小时同步一次）
0 * * * * ~/.claude/sync.sh
```

#### 方式二：Git hooks 自动推送

每次 commit 后自动同步：

```bash
# 创建 post-commit hook
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
~/.claude/sync.sh
EOF
chmod +x .git/hooks/post-commit
```

---

## 工作原理

1. `git pull` — 拉取远程更新，解决合并冲突（优先保留本地）
2. 扫描 `projects/*/` 目录下的 `.jsonl` session 文件
3. 每个项目目录只保留最近 N 个 session 文件
4. `git add` — 暂存变更
5. `git commit` + `git push` — 推送到远程

---

## 注意事项

- session 文件按修改时间排序，保留最新的 N 个
- 较旧的 session 文件从 git 索引移除（本地文件仍保留）
- 首次使用建议先手动运行 `./sync.sh --verbose` 确认无误

---

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
