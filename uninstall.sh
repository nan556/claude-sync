#!/usr/bin/env bash
# cc-sync uninstaller
# https://github.com/ikook-wang/cc-sync

set -euo pipefail

CLAUDE_DIR="$HOME/.claude"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

info()    { echo -e "${BLUE}[info]${NC} $*"; }
success() { echo -e "${GREEN}[done]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }

echo ""
echo -e "${BOLD}cc-sync uninstaller${NC}"
echo ""

# Confirm
echo -n "Uninstall cc-sync? This will NOT delete your git repo or synced data. [y/N] "
read -r answer
if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""

# 1. Remove sync files
info "Removing sync files..."
rm -f "$CLAUDE_DIR/sync.sh"
rm -f "$CLAUDE_DIR/sync.conf"
rm -f "$CLAUDE_DIR/uninstall.sh"
success "Removed sync.sh, sync.conf, uninstall.sh"

# 2. Remove SessionStart hook from settings.json
info "Removing SessionStart hook from settings.json..."
if [ -f "$CLAUDE_DIR/settings.json" ] && command -v python3 &>/dev/null; then
  python3 << 'PYTHON_SCRIPT'
import json
import os

settings_file = os.path.expanduser("~/.claude/settings.json")

try:
    with open(settings_file, "r") as f:
        settings = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    exit(0)

hooks = settings.get("hooks", {})
session_start = hooks.get("SessionStart", [])

# Remove hook groups containing "git -C ~/.claude pull"
new_session_start = []
for hook_group in session_start:
    keep = True
    for hook in hook_group.get("hooks", []):
        if "git -C ~/.claude pull" in hook.get("command", ""):
            keep = False
            break
    if keep:
        new_session_start.append(hook_group)

if new_session_start:
    hooks["SessionStart"] = new_session_start
elif "SessionStart" in hooks:
    del hooks["SessionStart"]

settings["hooks"] = hooks

with open(settings_file, "w") as f:
    json.dump(settings, f, indent=2, ensure_ascii=False)
    f.write("\n")
PYTHON_SCRIPT
  success "SessionStart hook removed."
else
  warn "Could not patch settings.json. Please remove SessionStart hook manually."
fi

# 3. Remove shell wrapper
info "Removing shell wrapper..."
for rc_file in "$HOME/.zshrc" "$HOME/.bashrc"; do
  if [ -f "$rc_file" ] && grep -q "cc-sync" "$rc_file" 2>/dev/null; then
    # Remove the cc-sync block (from comment to closing brace)
    sed -i.bak '/# cc-sync:/,/^}/d' "$rc_file"
    # Also remove any blank lines left behind
    sed -i.bak '/^$/N;/^\n$/d' "$rc_file"
    rm -f "${rc_file}.bak"
    success "Removed wrapper from $rc_file"
  fi
done

echo ""
echo -e "${GREEN}${BOLD}cc-sync has been uninstalled.${NC}"
echo ""
echo "  Your git repo and synced data are preserved in ~/.claude/"
echo "  To fully remove, run: rm -rf ~/.claude/.git"
echo ""
