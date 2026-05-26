"""
auto_update.py
Network Error Dashboard — Auto Update Script
สร้างโดย: Pattana Chancheam

รันอัตโนมัติทุก 08:30 และ 16:30 ผ่าน Windows Task Scheduler
อ่านไฟล์ Excel จาก Network Share → แปลงเป็น data.json
"""

import os
import json
import glob
import sys
from datetime import datetime
from pathlib import Path

try:
    import openpyxl
except ImportError:
    os.system("pip install openpyxl")
    import openpyxl

# ══════════════════════════════════════════════
#  CONFIG — แก้ไขตรงนี้
# ══════════════════════════════════════════════

# โฟลเดอร์ที่เก็บไฟล์ทั้งหมด
OUTPUT_DIR = r"D:\Network Error Dashboard"

# Sheet Name
SHEET_NAME = "Data"  # Sheet ใน atg_site_user.xlsx

# Output
OUTPUT_JSON = os.path.join(OUTPUT_DIR, "data.json")
LOG_FILE    = os.path.join(OUTPUT_DIR, "auto_update.log")

# ══════════════════════════════════════════════

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def find_latest_excel(folder):
    """หาไฟล์ atg_site_user.xlsx"""
    target = os.path.join(folder, "atg_site_user.xlsx")
    if os.path.exists(target):
        return target
    log("ERROR: ไม่พบไฟล์ atg_site_user.xlsx")
    return None

def read_excel(filepath):
    """อ่าน Excel Sheet Add_Data_Network"""
    log(f"อ่านไฟล์: {filepath}")
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)

    # หา Sheet
    if SHEET_NAME in wb.sheetnames:
        ws = wb[SHEET_NAME]
    else:
        # ถ้าไม่เจอชื่อตรง ใช้ Sheet แรก
        ws = wb.active
        log(f"ไม่พบ Sheet '{SHEET_NAME}' ใช้ Sheet: {ws.title}")

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        log("ไม่มีข้อมูลในไฟล์")
        return []

    headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[0])]
    log(f"Headers: {headers}")
    log(f"จำนวนแถว: {len(rows)-1}")

    # Map column names to standard Thai keys
    # รองรับทั้งชื่อ English และ Thai
    COL_MAP = {
        # English
        'Station ID':     'รหัสสถานี',
        'Name':           'ชื่อ',
        'Last Inventory': 'คงเหลือล่าสุด',
        'Last Closed Day':'ปิดวันล่าสุด',
        'Remark':         'หมายเหตุ',
        'Province':       'จังหวัด',
        'Phone':          'โทร',
        'Contact':        'ชื่อผู้ติดต่อ',
        # Thai (ถ้าไฟล์มีหัว Thai อยู่แล้ว)
        'รหัสสถานี':      'รหัสสถานี',
        'ชื่อ':           'ชื่อ',
        'คงเหลือล่าสุด':  'คงเหลือล่าสุด',
        'ปิดวันล่าสุด':   'ปิดวันล่าสุด',
        'หมายเหตุ':       'หมายเหตุ',
        'จังหวัด':        'จังหวัด',
        'โทร':            'โทร',
        'ชื่อผู้ติดต่อ':  'ชื่อผู้ติดต่อ',
    }

    data = []
    for row in rows[1:]:
        if all(v is None for v in row):
            continue
        record = {}
        for i, val in enumerate(row):
            if i >= len(headers):
                continue
            col = headers[i]
            if col not in COL_MAP:
                continue
            thai_key = COL_MAP[col]
            if isinstance(val, datetime):
                record[thai_key] = val.strftime("%Y-%m-%d %H:%M")
            elif val is None:
                record[thai_key] = ""
            else:
                record[thai_key] = str(val).strip()
        if record.get('รหัสสถานี','').strip():
            data.append(record)

    wb.close()
    return data

def save_json(data, filepath, source_file):
    """บันทึก data.json"""
    output = {
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source_file": os.path.basename(source_file),
        "total": len(data),
        "data": data
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    log(f"บันทึก data.json สำเร็จ ({len(data)} รายการ)")

def main():
    log("=" * 50)
    log("Network Error Dashboard — Auto Update เริ่มทำงาน")

    # 1. หาไฟล์ Excel ล่าสุดใน D:\Network Error Dashboard
    log(f"ค้นหาไฟล์ Excel ใน: {OUTPUT_DIR}")
    excel_file = find_latest_excel(OUTPUT_DIR)
    if not excel_file:
        log(f"ERROR: ไม่พบไฟล์ Excel ใน {month_folder}")
        sys.exit(1)

    log(f"ไฟล์ล่าสุด: {os.path.basename(excel_file)}")

    # 3. อ่าน Excel
    try:
        data = read_excel(excel_file)
    except Exception as e:
        log(f"ERROR อ่านไฟล์: {e}")
        sys.exit(1)

    if not data:
        log("ไม่มีข้อมูล")
        sys.exit(1)

    # 4. บันทึก JSON
    try:
        save_json(data, OUTPUT_JSON, excel_file)
    except Exception as e:
        log(f"ERROR บันทึก JSON: {e}")
        sys.exit(1)

    log("Auto Update เสร็จสิ้น ✓")

    # 5. Push ขึ้น GitHub
    push_to_github()

    log("=" * 50)

def push_to_github():
    import subprocess
    log("Push ขึ้น GitHub...")
    cmds = [
        ["git", "-C", OUTPUT_DIR, "add", "data.json"],
        ["git", "-C", OUTPUT_DIR, "commit", "-m",
         f"Auto update data {datetime.now().strftime('%Y-%m-%d %H:%M')}"],
        ["git", "-C", OUTPUT_DIR, "push", "origin", "main"],
    ]
    for cmd in cmds:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            # commit อาจ return 1 ถ้าไม่มีการเปลี่ยนแปลง — ไม่ถือว่า error
            if "nothing to commit" in result.stdout + result.stderr:
                log("ไม่มีการเปลี่ยนแปลง ไม่ต้อง commit")
                return
            log(f"Git warning: {result.stderr.strip()}")
        else:
            log(f"OK: {' '.join(cmd[2:])}")

if __name__ == "__main__":
    main()
