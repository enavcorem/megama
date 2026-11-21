// בונה את האתר מהקטלוג.
//   node tools/build.mjs          מעתיק קבצים ציבוריים ל-files/, כותב data/catalog.js, ובונה את הדף הפרטי
//   node tools/build.mjs --check  רק בודק (דליפות, קבצים חסרים), בלי לשנות כלום
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(SITE, '..');                      // תיקיית המגמה
const PRIV = path.join(ROOT, 'אתר המגמה - פרטי');
const SITE_URL = 'https://enavcorem.github.io/megama/';
const CHECK = process.argv.includes('--check');

// שומר דליפות: מה שאסור שיגיע לאתר הציבורי
const BANNED = /(פתרון|מפתח|בוחן|מבחן|מחוון|backup|private|פרטי)/i;
const ALLOWED_EXT = new Set(['.xlsx', '.xls', '.docx', '.pdf', '.pptx', '.csv', '.png', '.jpg', '.gs', '.txt', '.md']);
const KINDS = new Set(['שיעור', 'לומדה', 'בוחן', 'מבחן', 'הדגמה', 'בוקר', 'סיור', 'תרגול', 'חוברת טיפים', 'תוכנית']);

const errors = [];
const warnings = [];
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));

const gradeFiles = fs.readdirSync(path.join(SITE, 'data')).filter((f) => /^g\d+\.json$/.test(f)).sort();
const config = fs.existsSync(path.join(PRIV, 'config.json')) ? readJson(path.join(PRIV, 'config.json')) : {};

const publicGrades = [];
const privateGrades = [];
const usedDest = new Set();
const ids = new Set();

for (const gf of gradeFiles) {
  const key = gf.replace('.json', '');
  const g = readJson(path.join(SITE, 'data', gf));
  const privPath = path.join(PRIV, `${key}.private.json`);
  const priv = fs.existsSync(privPath) ? readJson(privPath).items || {} : {};
  const unitIds = new Set((g.units || []).map((u) => u.id));
  const pubItems = [];
  const privItems = [];

  for (const it of g.items || []) {
    const where = `${key} / ${it.id || '?'}`;
    if (!it.id) errors.push(`${where}: חסר id`);
    if (ids.has(it.id)) errors.push(`${where}: id כפול`);
    ids.add(it.id);
    if (!unitIds.has(it.unit)) errors.push(`${where}: יחידה לא מוכרת "${it.unit}"`);
    if (!KINDS.has(it.kind)) warnings.push(`${where}: סוג לא מוכר "${it.kind}"`);

    // קבצים ציבוריים
    const files = [];
    (it.files || []).forEach((f, i) => {
      const abs = path.join(ROOT, f.src);
      const ext = path.extname(f.src).toLowerCase();
      const before = errors.length;
      if (f.src.split('/').some((s) => s.startsWith('_'))) errors.push(`${where}: קובץ מתיקיית _ לא יוצא לציבור: ${f.src}`);
      if (BANNED.test(f.src)) errors.push(`${where}: שם שנראה פרטי (פתרון/בוחן/מבחן...): ${f.src}`);
      if (!ALLOWED_EXT.has(ext)) errors.push(`${where}: סוג קובץ לא מורשה: ${f.src}`);
      if (!fs.existsSync(abs)) errors.push(`${where}: הקובץ לא נמצא: ${f.src}`);
      if (errors.length > before) return;   // לא מעתיקים קובץ שנכשל בבדיקה
      const dest = `files/${key}/${it.id}-${i + 1}${ext}`;
      usedDest.add(dest);
      if (!CHECK) {
        fs.mkdirSync(path.join(SITE, 'files', key), { recursive: true });
        fs.copyFileSync(abs, path.join(SITE, dest));
      }
      files.push({ label: f.label, href: dest, name: path.basename(f.src), size: fs.statSync(abs).size });
    });

    const allLinks = it.links || [];
    const pub = { ...it, files, links: allLinks.filter((l) => l.shared !== false) };
    pubItems.push(pub);

    // גרסה פרטית: כל הקישורים, קבצים ציבוריים מהאתר החי, וקבצים פרטיים כנתיב בדרייב
    const p = priv[it.id];
    let privBlock;
    if (p) {
      privBlock = {
        ...p,
        files: (p.files || []).map((f) => ({
          label: f.label,
          src: f.src,
          drivePath: `מידע ונתונים - חומרי המגמה/${f.src}`,
          missing: !fs.existsSync(path.join(ROOT, f.src)),
        })),
      };
      privBlock.files.filter((f) => f.missing).forEach((f) => warnings.push(`${where}: קובץ פרטי לא נמצא: ${f.src}`));
    }
    privItems.push({
      ...it,
      files: files.map((f) => ({ ...f, href: SITE_URL + f.href })),
      links: allLinks,
      private: privBlock,
    });
  }
  Object.keys(priv).filter((id) => !(g.items || []).some((it) => it.id === id))
    .forEach((id) => warnings.push(`${key}: בפרטי יש פריט שלא קיים בציבורי: ${id}`));

  const base = { key, grade: g.grade, gradeLabel: g.gradeLabel, intro: g.intro, units: g.units };
  publicGrades.push({ ...base, items: pubItems });
  privateGrades.push({ ...base, items: privItems });
}

// קבצים ישנים ב-files/ שכבר לא בקטלוג
const stale = [];
const filesDir = path.join(SITE, 'files');
if (fs.existsSync(filesDir)) {
  for (const d of fs.readdirSync(filesDir)) {
    const sub = path.join(filesDir, d);
    if (!fs.statSync(sub).isDirectory()) continue;
    for (const f of fs.readdirSync(sub)) {
      const rel = `files/${d}/${f}`;
      if (!usedDest.has(rel)) stale.push(rel);
    }
  }
}
if (!CHECK) stale.forEach((rel) => fs.rmSync(path.join(SITE, rel)));
else stale.forEach((rel) => warnings.push(`קובץ ישן ב-files/ (יימחק בבנייה): ${rel}`));

// בדיקת תוכן של קובצי xlsx/docx (גיליונות מוסתרים, מילים חשודות)
const leak = path.join(SITE, 'tools', 'leak_check.py');
if (fs.existsSync(leak) && fs.existsSync(filesDir) && !CHECK) {
  const r = spawnSync('py', ['-I', leak, filesDir], { encoding: 'utf8' });
  if (r.status === 2) errors.push('בדיקת התוכן מצאה בעיה:\n' + r.stdout);
  else if (r.stdout && r.stdout.trim()) warnings.push(r.stdout.trim());
}

const today = new Date().toLocaleDateString('he-IL');
if (!CHECK && !errors.length) {
  const pubCatalog = { mode: 'public', built: today, grades: publicGrades };
  fs.writeFileSync(path.join(SITE, 'data', 'catalog.js'),
    '// נוצר אוטומטית מ-tools/build.mjs. לא לערוך ידנית.\nwindow.CATALOG = ' + JSON.stringify(pubCatalog, null, 1) + ';\n');

  // הדף הפרטי: קובץ אחד, הכול בפנים, מתפרסם כארטיפקט פרטי
  fs.mkdirSync(PRIV, { recursive: true });
  const privCatalog = { mode: 'private', built: today, siteUrl: SITE_URL, driveUrl: config.driveUrl || '', grades: privateGrades };
  const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
  const html = `<title>המגמה שלי</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+Hebrew:wght@400;500;600&family=Secular+One&display=swap">
<style>${fs.readFileSync(path.join(SITE, 'style.css'), 'utf8')}</style>
<div dir="rtl" lang="he">
<header class="masthead"><div class="wrap">
  <h1>מידע ונתונים <span class="private-flag">דף פרטי</span></h1><br>
  <p class="sub">כל מה שבאתר, ועוד ההערות שלי, הפתרונות והמבחנים</p>
  <nav class="tabs" id="tabs" aria-label="שכבות"></nav>
</div></header>
<main class="wrap">
  <div class="fx"><label for="q">fx</label><input id="q" type="search" placeholder="חיפוש: COUNTIF, אחוזים, מוקשים..." autocomplete="off"></div>
  <div id="app"></div>
  <footer><span id="built"></span></footer>
</main>
</div>
<script>window.CATALOG = ${safe(JSON.stringify(privCatalog))};</script>
<script>${safe(fs.readFileSync(path.join(SITE, 'app.js'), 'utf8'))}</script>
`;
  fs.writeFileSync(path.join(PRIV, 'דף פרטי.html'), html);
}

// דוח
const count = publicGrades.reduce((n, g) => n + g.items.length, 0);
const fileCount = usedDest.size;
console.log(`${CHECK ? 'בדיקה' : 'בנייה'}: ${publicGrades.length} שכבות, ${count} פריטים, ${fileCount} קבצים ציבוריים`);
warnings.forEach((w) => console.log('  ! ' + w));
errors.forEach((e) => console.log('  ✖ ' + e));
if (errors.length) { console.log(`\n${errors.length} שגיאות. שום דבר לא נכתב לקטלוג.`); process.exit(1); }
console.log(CHECK ? 'אין שגיאות.' : 'נכתב: data/catalog.js, files/, ו"אתר המגמה - פרטי/דף פרטי.html"');
