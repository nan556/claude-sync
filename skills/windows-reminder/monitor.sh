#!/bin/bash
# Background monitor for Windows reminders

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while true; do
    python3 "$SCRIPT_DIR/reminder_tool.py" check 2>/dev/null
    sleep 60
done
