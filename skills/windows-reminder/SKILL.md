---
name: windows-reminder
description: Use when user asks to set a time reminder, query reminders, or cancel reminders on Windows 11 with WSL2.
---

# Windows Desktop Reminder

## Overview

Sets Windows desktop popup reminders via WSL2. Supports multiple reminder types: once, daily, workday, weekly, weekend, and holiday eve reminders. Reminders persist across sessions.

## Quick Reference

| Operation | Command |
|-----------|---------|
| 单次提醒 | `set "HH:MM" "消息"` |
| 每日提醒 | `set "HH:MM" "消息" --type daily` |
| 工作日提醒 | `set "HH:MM" "消息" --type workday` |
| 每周提醒 | `set "HH:MM" "消息" --type weekly --weekdays 1,3,5` |
| 周末提醒 | `set "HH:MM" "消息" --type weekend` |
| 节假日前提醒 | `set "HH:MM" "消息" --type holiday_eve` |
| 查询提醒 | `query-reminders` |
| 取消提醒 | `cancel-reminder <id>` |
| 取消全部 | `cancel-all-reminders` |
| 刷新节假日缓存 | `refresh-holidays` |

## Reminder Types

| Type | Trigger |
|------|---------|
| once | One-time only (deleted after firing) |
| daily | Every day at the same time |
| workday | Mon-Fri, excluding public holidays |
| weekly | Specific weekdays (1=Mon, 7=Sun) |
| weekend | Saturday and Sunday only |
| holiday_eve | Day before a public holiday |

### Weekdays Format

For weekly reminders, use `--weekdays` with comma-separated numbers:
- `--weekdays 1,3,5` = Monday, Wednesday, Friday
- `--weekdays 2` = Tuesday only
- `--weekdays 6,7` = Saturday and Sunday

## Setting a Reminder

```
set "14:55" "该去开会了"
```

```
set "09:00" "每日喝水提醒" --type daily
```

```
set "09:00" "周三开会" --type weekly --weekdays 3
```

## Querying Reminders

```
query-reminders
```

Lists all reminders with ID, time, type, status, and message.

## Cancelling Reminders

```
cancel-reminder <id>
```

```
cancel-all-reminders
```

## Holiday Data

Workday and holiday_eve reminders use the timor.tech API to determine Chinese public holidays. If the API is unavailable, workday defaults to Mon-Fri based on weekday only.

## Implementation

- **Script**: `~/.claude/skills/windows-reminder/reminder_tool.py`
- **Data**: `~/.claude/skills/windows-reminder/reminders.json`
- **Holiday Cache**: `~/.claude/skills/windows-reminder/holiday_cache.json`
- **Monitor**: Background bash loop checks every 60 seconds

## Common Mistakes

- **Wrong time format**: Use `HH:MM` 24-hour format, e.g., `14:55` not `2:55 PM`
- **Reminder not appearing**: Check WSL can reach Windows with `powershell.exe -c "echo test"`
- **Multiple notifications**: Ensure only one background monitor runs at a time
- **Weekly reminder not firing**: Check weekdays parameter is correct (1=Mon, 7=Sun)
