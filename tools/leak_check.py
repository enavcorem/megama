# בדיקת תוכן לקבצים הציבוריים: גיליונות מוסתרים ושמות חשודים בתוך xlsx/docx.
# הרצה: py -I tools/leak_check.py files
# יציאה 0 = נקי או רק אזהרות, 2 = שגיאה (שם גיליון של פתרון או מפתח)
import re
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ERR = re.compile(r"פתרון|מפתח תשובות|מחוון")
WARN = re.compile(r"תשובות|סודי")
OK_HIDDEN = re.compile(r"הפתע|ניצחון")  # גיליון הפתעה שנחשף ב-100, מכוון

errors, warnings = [], []
for f in sorted(Path(sys.argv[1]).rglob("*")):
    if f.suffix.lower() not in (".xlsx", ".docx"):
        continue
    try:
        z = zipfile.ZipFile(f)
    except zipfile.BadZipFile:
        errors.append(f"{f.name}: קובץ פגום")
        continue
    if f.suffix.lower() == ".xlsx":
        wb = z.read("xl/workbook.xml").decode("utf8")
        for m in re.finditer(r"<sheet\b[^>]*>", wb):
            tag = m.group(0)
            name = re.search(r'name="([^"]*)"', tag).group(1)
            state = re.search(r'state="([^"]*)"', tag)
            if ERR.search(name):
                errors.append(f"{f.name}: גיליון בשם '{name}'")
            elif state and state.group(1) in ("hidden", "veryHidden") and not OK_HIDDEN.search(name):
                warnings.append(f"{f.name}: גיליון מוסתר '{name}' ({state.group(1)})")
            elif WARN.search(name):
                warnings.append(f"{f.name}: גיליון '{name}' (לוודא שאין בו פתרון)")
        for m in re.finditer(r'<definedName\b[^>]*name="([^"]*)"', wb):
            if ERR.search(m.group(1)):
                errors.append(f"{f.name}: שם טווח '{m.group(1)}'")
    else:
        doc = z.read("word/document.xml").decode("utf8")
        if ERR.search(re.sub(r"<[^>]+>", "", doc)):
            warnings.append(f"{f.name}: המסמך מזכיר פתרון/מחוון (לוודא)")

for e in errors:
    print("✖ " + e)
for w in warnings:
    print("! " + w)
sys.exit(2 if errors else 0)
