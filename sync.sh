#!/usr/bin/env bash
# cc-sync: Claude Code configuration sync script
# https://github.com/ikook-wang/cc-sync

CLAUDE_DIR="$HOME/.claude"
CONF_FILE="$CLAUDE_DIR/sync.conf"
VERBOSE=false

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=true ;;
  esac
done

log() { $VERBOSE && echo "[cc-sync] $*"; }

# Read config
KEEP_SESSIONS=3
if [ -f "$CONF_FILE" ]; then
  # shellcheck source=/dev/null
  . "$CONF_FILE"
fi

cd "$CLAUDE_DIR" || exit 0

# Ensure we're in a git repo with a remote
git rev-parse --is-inside-work-tree &>/dev/null || exit 0
git remote get-url origin &>/dev/null || exit 0

log "Pulling remote changes..."
git pull --no-rebase --autostash --quiet 2>/dev/null || {
  log "Merge conflict detected, auto-resolving with local version..."
  git checkout --ours . 2>/dev/null
  git add -A 2>/dev/null
  git commit -m "sync: auto-resolve merge conflicts" --quiet 2>/dev/null || true
}

log "Processing session files (keeping $KEEP_SESSIONS per project)..."

# Iterate over each project directory
for project_dir in projects/*/; do
  [ -d "$project_dir" ] || continue

  # Find .jsonl files sorted by modification time (newest first)
  # Compatible with bash 3.2 (no mapfile)
  jsonl_files=()
  while IFS= read -r file; do
    [ -n "$file" ] && jsonl_files+=("$file")
  done < <(find "$project_dir" -maxdepth 1 -name "*.jsonl" -exec ls -t {} + 2>/dev/null)

  [ ${#jsonl_files[@]} -eq 0 ] && continue

  log "  $project_dir: ${#jsonl_files[@]} sessions found"

  # Force-add the most recent N sessions
  for ((i=0; i<KEEP_SESSIONS && i<${#jsonl_files[@]}; i++)); do
    git add -f "${jsonl_files[$i]}" 2>/dev/null || true
    log "    + ${jsonl_files[$i]}"

    # Also add the corresponding UUID directory (subagents, tool-results)
    uuid_dir="${jsonl_files[$i]%.jsonl}"
    if [ -d "$uuid_dir" ]; then
      git add -f "$uuid_dir" 2>/dev/null || true
    fi
  done

  # Remove older sessions from git index only (keep local files)
  for ((i=KEEP_SESSIONS; i<${#jsonl_files[@]}; i++)); do
    if git ls-files --error-unmatch "${jsonl_files[$i]}" &>/dev/null; then
      git rm --cached --quiet "${jsonl_files[$i]}" 2>/dev/null || true
      log "    - ${jsonl_files[$i]}"
    fi

    uuid_dir="${jsonl_files[$i]%.jsonl}"
    if [ -d "$uuid_dir" ] && git ls-files --error-unmatch "$uuid_dir" &>/dev/null; then
      git rm -r --cached --quiet "$uuid_dir" 2>/dev/null || true
    fi
  done
done

# Stage all other tracked files
git add -A 2>/dev/null || true

# Commit and push if there are changes
if ! git diff --cached --quiet 2>/dev/null; then
  log "Committing changes..."
  git commit -m "sync" --quiet 2>/dev/null || true
fi

log "Pushing to remote..."
git push --quiet 2>/dev/null || true

log "Done."
