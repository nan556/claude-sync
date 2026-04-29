#!/usr/bin/env python3
"""Windows Desktop Reminder Tool - runs via WSL2 to show Windows notifications"""

import subprocess
import sys
import json
import os
import signal
from pathlib import Path
from datetime import datetime, timedelta
import requests

TOOL_PATH = Path(__file__).parent
REMINDERS_FILE = TOOL_PATH / "reminders.json"
BACKGROUND_PID_FILE = TOOL_PATH / "monitor.pid"
HOLIDAY_API = "https://timor.tech/api/holiday"
HOLIDAY_CACHE_FILE = TOOL_PATH / "holiday_cache.json"


def show_windows_notification(title, message):
    """Show Windows desktop notification via PowerShell with topmost window"""
    # Escape single quotes in message
    title_escaped = title.replace("'", "''")
    message_escaped = message.replace("'", "''")
    script = f"""
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    # Create rounded border path
    function Get-RoundedRect {{ param($rect, $radius)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
        $path.AddArc($rect.X + $rect.Width - $radius, $rect.Y, $radius, $radius, 270, 90)
        $path.AddArc($rect.X + $rect.Width - $radius, $rect.Y + $rect.Height - $radius, $radius, $radius, 0, 90)
        $path.AddArc($rect.X, $rect.Y + $rect.Height - $radius, $radius, $radius, 90, 90)
        $path.CloseFigure()
        return $path
    }}
    # Main form
    $form = New-Object System.Windows.Forms.Form
    $form.Text = '{title_escaped}'
    $form.Width = 340
    $form.Height = 160
    $form.StartPosition = 'CenterScreen'
    $form.TopMost = $true
    $form.FormBorderStyle = 'None'
    $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
    # Draw rounded border
    $form.Paint += {{
        $e = $_.Graphics
        $e.SmoothingMode = 'AntiAlias'
        $rect = New-Object System.Drawing.Rectangle(0, 0, $form.Width - 1, $form.Height - 1)
        $path = Get-RoundedRect -rect $rect -radius 16
        $e.DrawPath([System.Drawing.Pens]::FromArgb(80, 80, 80), $path)
    }}
    # Icon circle with "!" - use Label control
    $iconBg = New-Object System.Windows.Forms.Panel
    $iconBg.Location = New-Object System.Drawing.Point(25, 35)
    $iconBg.Size = New-Object System.Drawing.Size(44, 44)
    $iconBg.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $form.Controls.Add($iconBg)
    # "!" text on the icon
    $iconLabel = New-Object System.Windows.Forms.Label
    $iconLabel.Dock = 'Fill'
    $iconLabel.Text = '!'
    $iconLabel.Font = New-Object System.Drawing.Font('Arial', 24, [System.Drawing.FontStyle]::Bold)
    $iconLabel.ForeColor = [System.Drawing.Color]::White
    $iconLabel.TextAlign = 'MiddleCenter'
    $iconBg.Controls.Add($iconLabel)
    # Title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Location = New-Object System.Drawing.Point(80, 30)
    $titleLabel.Size = New-Object System.Drawing.Size(200, 25)
    $titleLabel.Text = '{title_escaped}'
    $titleLabel.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 13, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = [System.Drawing.Color]::White
    $form.Controls.Add($titleLabel)
    # Message
    $msgLabel = New-Object System.Windows.Forms.Label
    $msgLabel.Location = New-Object System.Drawing.Point(80, 55)
    $msgLabel.Size = New-Object System.Drawing.Size(230, 50)
    $msgLabel.Text = '{message_escaped}'
    $msgLabel.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10)
    $msgLabel.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
    $msgLabel.Padding = New-Object System.Windows.Forms.Padding(0, 5, 0, 0)
    $form.Controls.Add($msgLabel)
    # OK Button
    $okButton = New-Object System.Windows.Forms.Button
    $okButton.Location = New-Object System.Drawing.Point(220, 115)
    $okButton.Size = New-Object System.Drawing.Size(95, 32)
    $okButton.Text = '确定'
    $okButton.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10)
    $okButton.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $okButton.ForeColor = [System.Drawing.Color]::White
    $okButton.FlatStyle = 'Flat'
    $okButton.FlatAppearance.BorderSize = 0
    $okButton.Cursor = 'Hand'
    $okButton.Paint += {{
        $e = $_.Graphics
        $e.SmoothingMode = 'AntiAlias'
        $rect = New-Object System.Drawing.Rectangle(0, 0, $okButton.Width - 1, $okButton.Height - 1)
        $path = Get-RoundedRect -rect $rect -radius 6
        $e.FillPath([System.Drawing.SolidBrush]::FromArgb(0, 120, 215), $path)
    }}
    $okButton.DialogResult = 'OK'
    $form.Controls.Add($okButton)
    $form.AcceptButton = $okButton
    [void]$form.ShowDialog()
    """
    try:
        subprocess.run(
            ["powershell.exe", "-Command", script],
            capture_output=True,
            timeout=30
        )
        return True
    except Exception as e:
        print(f"Failed to show notification: {e}", file=sys.stderr)
        return False


def load_reminders():
    """Load reminders from JSON file"""
    if not REMINDERS_FILE.exists():
        return []
    try:
        with open(REMINDERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_reminders(reminders):
    """Save reminders to JSON file"""
    TOOL_PATH.mkdir(parents=True, exist_ok=True)
    with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(reminders, f, ensure_ascii=False, indent=2)


def set_reminder(time_str, message, reminder_type="once", weekdays=None, holiday_date=None):
    """Set a new reminder.

    reminder_type: once / daily / workday / weekly / weekend / holiday_eve
    weekdays: list of ints [1-7] (1=Mon, 7=Sun), used for 'weekly' type
    holiday_date: ISO date string, used for 'holiday_eve' type
    """
    reminders = load_reminders()

    # Generate ID
    new_id = 1
    if reminders:
        new_id = max(r["id"] for r in reminders) + 1

    reminder = {
        "id": new_id,
        "time": time_str,
        "message": message,
        "type": reminder_type,  # once/daily/workday/weekly/weekend/holiday_eve
        "weekdays": weekdays if weekdays is not None else [],  # [1,2,3,4,5] for weekly type (1=Mon, 7=Sun)
        "holiday_date": holiday_date,  # for holiday_eve type
        "status": "pending",
        "created": datetime.now().isoformat()
    }
    reminders.append(reminder)
    save_reminders(reminders)

    # Start background monitor if not running
    ensure_monitor_running()

    return new_id


def query_reminders():
    """Query all reminders"""
    reminders = load_reminders()
    if not reminders:
        print("No reminders set.")
        return

    print(f"{'ID':<6} {'Time':<10} {'Type':<12} {'Status':<10} Message")
    print("-" * 80)
    for r in reminders:
        # Support old records that still have 'recurring' field
        if "type" in r:
            type_str = r["type"]
        else:
            type_str = "daily" if r.get("recurring", False) else "once"
        print(f"{r['id']:<6} {r['time']:<10} {type_str:<12} {r['status']:<10} {r['message']}")


def cancel_reminder(reminder_id):
    """Cancel a specific reminder"""
    reminders = load_reminders()
    original_count = len(reminders)

    reminders = [r for r in reminders if r["id"] != int(reminder_id)]

    if len(reminders) == original_count:
        print(f"Reminder {reminder_id} not found.")
        return False

    save_reminders(reminders)
    print(f"Reminder {reminder_id} cancelled.")
    return True


def cancel_all_reminders():
    """Cancel all reminders"""
    save_reminders([])
    print("All reminders cancelled.")


def check_and_fire_reminders():
    """Check pending reminders and fire any that are due"""
    reminders = load_reminders()
    current_time = datetime.now().strftime("%H:%M")
    current_minute = datetime.now().strftime("%Y-%m-%d %H:%M")  # Track exact minute
    current_weekday = datetime.now().weekday() + 1  # 1=Mon, 7=Sun
    fired = False

    remaining = []

    # Track if we've already fired in this minute (prevents duplicate popups)
    fired_this_minute = set()

    for reminder in reminders:
        if reminder["status"] != "pending":
            continue

        if reminder["time"] != current_time:
            remaining.append(reminder)
            continue

        # Skip if already fired this minute (prevents duplicate popup from multiple monitors)
        if reminder["id"] in fired_this_minute:
            remaining.append(reminder)
            continue

        # 判断是否应该触发
        should_fire = False
        reminder_type = reminder.get("type", "once")

        if reminder_type == "once":
            should_fire = True
        elif reminder_type == "daily":
            should_fire = True
        elif reminder_type == "workday":
            should_fire = is_workday()
        elif reminder_type == "weekend":
            should_fire = current_weekday in [6, 7]
        elif reminder_type == "weekly":
            weekdays = reminder.get("weekdays", [])
            should_fire = current_weekday in weekdays
        elif reminder_type == "holiday_eve":
            should_fire = get_tomorrow_is_holiday()

        if should_fire:
            show_windows_notification("提醒", reminder["message"])
            fired = True
            fired_this_minute.add(reminder["id"])
            # once类型删除，其他保持
            if reminder_type != "once":
                remaining.append(reminder)
        else:
            remaining.append(reminder)

    if fired or len(remaining) != len(reminders):
        save_reminders(remaining)

    return fired


def ensure_monitor_running():
    """Start background monitor if not already running"""
    # Check if monitor is already running
    if BACKGROUND_PID_FILE.exists():
        try:
            with open(BACKGROUND_PID_FILE, "r") as f:
                pid_str = f.read().strip()
            if pid_str and pid_str != "placeholder":
                pid = int(pid_str)
                # Check if process exists
                os.kill(pid, 0)
                return  # Already running
        except (ValueError, FileNotFoundError, ProcessLookupError):
            pass  # Not running, need to start

    # Start background monitor
    monitor_script = TOOL_PATH / "monitor.sh"

    # Use nohup and redirect output, get actual PID
    proc = subprocess.Popen(
        ["bash", str(monitor_script)],
        cwd=str(TOOL_PATH),
        stdout=open("/dev/null", "w"),
        stderr=open("/dev/null", "w"),
        start_new_session=True
    )

    # Save actual PID of the bash process (not the Python subprocess)
    with open(BACKGROUND_PID_FILE, "w") as f:
        f.write(str(proc.pid))


def cleanup():
    """Remove PID file on exit"""
    if BACKGROUND_PID_FILE.exists():
        try:
            os.remove(BACKGROUND_PID_FILE)
        except:
            pass


def get_holiday_cache():
    """获取节假日缓存"""
    if not HOLIDAY_CACHE_FILE.exists():
        return {}
    try:
        with open(HOLIDAY_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}


def save_holiday_cache(cache):
    """保存节假日缓存"""
    TOOL_PATH.mkdir(parents=True, exist_ok=True)
    with open(HOLIDAY_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def fetch_holidays(year):
    """获取指定年份的节假日数据（通过PowerShell）"""
    try:
        # 通过PowerShell调用API（WSL下Python无法直接访问）
        ps_script = f"Invoke-RestMethod 'https://timor.tech/api/holiday/year/{year}' -TimeoutSec 10 | ConvertTo-Json -Compress"
        result = subprocess.run(
            ["powershell.exe", "-Command", ps_script],
            capture_output=True, timeout=15
        )
        if result.returncode == 0 and result.stdout:
            # PowerShell输出可能是GBK编码
            try:
                output = result.stdout.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    output = result.stdout.decode("gbk")
                except UnicodeDecodeError:
                    output = result.stdout.decode("latin1")
            if output.strip():
                data = json.loads(output.strip())
                if data.get("code") == 0:
                    return data.get("holiday", {})
    except Exception as e:
        print(f"Failed to fetch holidays: {e}", file=sys.stderr)
    return {}


def get_year_holidays():
    """获取年份节假日数据，使用缓存"""
    cache = get_holiday_cache()
    current_year = datetime.now().year

    # 检查缓存是否有效（年份匹配且有数据）
    if cache.get("year") == current_year and cache.get("holidays"):
        return cache["holidays"]

    # 缓存无效，重新获取
    holidays = fetch_holidays(current_year)
    if holidays:
        save_holiday_cache({"year": current_year, "holidays": holidays})
    return holidays


def get_today_info():
    """获取今日节假日信息"""
    try:
        resp = requests.get(f"{HOLIDAY_API}/today", timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Failed to fetch today info: {e}", file=sys.stderr)
    return {}


def is_workday():
    """判断今天是否是工作日"""
    today_str = datetime.now().strftime("%Y-%m-%d")
    holidays = get_year_holidays()

    # 遍历节假日数据查找今天
    for key, info in holidays.items():
        if info.get("date") == today_str:
            # dayoff=true 表示是节假日（放假）
            if info.get("dayoff"):
                return False  # 节假日
            else:
                return True   # 调休工作日

    # 无匹配节假日时根据星期判断
    weekday = datetime.now().weekday()
    return weekday < 5  # 周一到五


def get_tomorrow_is_holiday():
    """判断明天是否是节假日"""
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    holidays = get_year_holidays()

    # 检查明天是否节假日
    for key, info in holidays.items():
        if info.get("date") == tomorrow and info.get("holiday"):
            return True
    return False


def main():
    if len(sys.argv) < 2:
        print("Usage: reminder_tool.py <command> [args]")
        print("Commands: set <HH:MM> <message> [--type type] [--weekdays 1,3,5], query, cancel <id>, cancel-all, check, refresh-holidays")
        sys.exit(1)

    command = sys.argv[1]

    if command == "set" and len(sys.argv) >= 4:
        time_str = sys.argv[2]
        message = sys.argv[3]
        extra_args = sys.argv[4:]
        # Support --type <value> or legacy --daily
        reminder_type = "once"
        weekdays = []
        for i, arg in enumerate(extra_args):
            if arg == "--type" and i + 1 < len(extra_args):
                reminder_type = extra_args[i + 1]
            elif arg.startswith("--weekdays="):
                weekdays_str = arg.split("=")[1]
                weekdays = [int(x) for x in weekdays_str.split(",")]
        reminder_id = set_reminder(time_str, message, reminder_type, weekdays)
        type_str = f" ({reminder_type})" if reminder_type != "once" else ""
        print(f"Reminder set. ID: {reminder_id}, Time: {time_str}{type_str}")

    elif command == "query":
        query_reminders()

    elif command == "cancel" and len(sys.argv) >= 3:
        cancel_reminder(sys.argv[2])

    elif command == "cancel-all":
        cancel_all_reminders()

    elif command == "check":
        check_and_fire_reminders()

    elif command == "refresh-holidays":
        holidays = fetch_holidays(datetime.now().year)
        if holidays:
            save_holiday_cache({"year": datetime.now().year, "holidays": holidays})
            print(f"Holiday cache refreshed: {len(holidays)} entries")
        else:
            print("Failed to fetch holidays (check network/API)")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    finally:
        pass
