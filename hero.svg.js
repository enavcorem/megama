// האיור בראש האתר: גיליון עם תאים כחולים (נתון קבוע) וצהובים (כאן כותבים), גרף עמודות ופיזור.
// הצבעים מגיעים מ-style.css (מחלקות h-*), ולכן הוא מתחלף לבד במצב כהה ובצבע של כל חלק.
// app.js משבץ אותו ב-#hero. אותו קובץ משובץ גם בדף הפרטי (tools/build.mjs).
(function () {
  const COLS = ['A', 'B', 'C', 'D', 'E'];
  const ROWS = [
    // [קבוע, קבוע, קבוע, תוצאה, צהוב?]
    ['101', '92', '14', 'TRUE', 1],
    ['102', '78', '9', 'FALSE', 0],
    ['103', '88', '12', 'TRUE', 1],
    ['104', '65', '6', 'FALSE', 0],
    ['105', '95', '11', 'TRUE', 1],
    ['106', '81', '15', 'FALSE', 0],
  ];
  const X0 = 64, CW = 54, Y0 = 102, RH = 25;
  let cells = '';
  COLS.forEach((c, i) => {
    cells += `<rect class="h-hdr" x="${X0 + i * CW}" y="80" width="${CW}" height="22"/>` +
      `<text class="h-hdr-t" x="${X0 + i * CW + CW / 2}" y="95.5">${c}</text>`;
  });
  ROWS.forEach((r, j) => {
    const y = Y0 + j * RH;
    cells += `<rect class="h-hdr" x="40" y="${y}" width="24" height="${RH}"/>` +
      `<text class="h-hdr-t" x="52" y="${y + 17}">${j + 2}</text>`;
    r.slice(0, 4).forEach((v, i) => {
      const cls = i < 3 ? 'h-fixed' : (v === 'TRUE' ? 'h-true' : 'h-false');
      const fill = i === 3 && r[4] ? 'h-cell' : 'h-grid';
      cells += `<rect class="${fill}" x="${X0 + i * CW}" y="${y}" width="${CW}" height="${RH}"/>` +
        `<text class="${cls}" x="${X0 + i * CW + CW - 7}" y="${y + 17}" text-anchor="end">${v}</text>`;
    });
    cells += `<rect class="${j === 1 || j === 3 ? 'h-cell' : 'h-grid'}" x="${X0 + 4 * CW}" y="${y}" width="${CW}" height="${RH}"/>`;
  });
  // התא הפעיל
  cells += `<rect class="h-active" x="${X0 + 3 * CW}" y="${Y0}" width="${CW}" height="${RH}"/>`;

  // גרף עמודות: ששת הציונים מעמודה B, בקנה מידה אחד (0–100 ← 0–96px)
  const vals = ROWS.map((r) => Number(r[1]));
  const bx = 312, by = 262, bw = 18, gap = 9, scale = 0.96;
  let bars = '';
  vals.forEach((v, i) => {
    const h = v * scale;
    bars += `<rect class="${v >= 85 ? 'h-bar-hi' : 'h-bar'}" x="${bx + i * (bw + gap)}" y="${by - h}" width="${bw}" height="${h}" rx="2"/>`;
  });
  // קו הסף 85
  bars += `<line class="h-thresh" x1="${bx - 6}" x2="${bx + 6 * (bw + gap) - 3}" y1="${by - 85 * scale}" y2="${by - 85 * scale}"/>` +
    `<text class="h-small" x="${bx - 9}" y="${by - 85 * scale + 4}" text-anchor="end">85</text>`;

  // פיזור: שעות (C) מול ציון (B), וקו מגמה
  const sx = (h) => 340 + (h - 5) * 9.5, sy = (s) => 112 - (s - 60) * 1.9;
  let dots = '';
  ROWS.forEach((r) => { dots += `<circle class="h-dot" cx="${sx(+r[2])}" cy="${sy(+r[1])}" r="4.2"/>`; });

  window.HERO_SVG = `<svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" direction="ltr" role="img" aria-label="גיליון אקסל עם גרף עמודות ותרשים פיזור">
  <rect class="h-shadow" x="26" y="34" width="330" height="246" rx="12"/>
  <rect class="h-card" x="22" y="28" width="330" height="246" rx="12"/>
  <rect class="h-fx" x="40" y="44" width="294" height="26" rx="5"/>
  <text class="h-fx-l" x="52" y="61.5">fx</text>
  <line class="h-sep" x1="72" x2="72" y1="49" y2="65"/>
  <text class="h-formula" x="82" y="61.5">=AND(B2&gt;=85, C2&gt;=10)</text>
  ${cells}
  <rect class="h-shadow" x="296" y="160" width="190" height="120" rx="12"/>
  <rect class="h-card" x="292" y="154" width="190" height="120" rx="12"/>
  <line class="h-axis" x1="306" x2="470" y1="262" y2="262"/>
  ${bars}
  <rect class="h-shadow" x="318" y="18" width="168" height="114" rx="12"/>
  <rect class="h-card" x="314" y="12" width="168" height="114" rx="12"/>
  <line class="h-axis" x1="328" x2="470" y1="114" y2="114"/>
  <line class="h-axis" x1="328" x2="328" y1="24" y2="114"/>
  <line class="h-trend" x1="${sx(5)}" y1="${sy(64)}" x2="${sx(16)}" y2="${sy(95)}"/>
  ${dots}
</svg>`;
})();
