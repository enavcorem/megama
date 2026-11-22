// תצוגת הקטלוג. אותו קוד משמש את האתר הציבורי ואת הדף הפרטי (mode: 'private').
(function () {
  const C = window.CATALOG;
  const PRIVATE = C.mode === 'private';
  const app = document.getElementById('app');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // טקסט עם `קוד` הופך ל-<code dir="ltr">
  const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>');
  // נרמול לחיפוש: בלי ניקוד ובלי גרשיים
  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[֑-ׇ]/g, '').replace(/["'״׳`]/g, '');

  const STATUS_CLASS = { 'נוסה בכיתה': 'st-ok' };
  const byId = {};
  C.grades.forEach((g) => g.items.forEach((it) => { byId[it.id] = { it, g }; }));

  function haystack(it, g) {
    const unit = (g.units.find((u) => u.id === it.unit) || {}).title;
    const priv = it.private ? [it.private.howItWent, it.private.fixNextYear, it.private.notes] : [];
    return norm([it.title, it.kind, it.summary, it.story, unit, g.gradeLabel,
      (it.functions || []).join(' '), (it.flow || []).join(' '), (it.traps || []).join(' '),
      (it.traps && it.traps.length ? 'מוקשים מוקש' : ''), ...priv].join(' '));
  }

  function fileList(files) {
    if (!files || !files.length) return '';
    return '<ul class="files">' + files.map((f) => {
      const ext = esc((f.name || f.src || '').split('.').pop());
      if (f.href) {
        const size = f.size ? ` · ${Math.max(1, Math.round(f.size / 1024))}KB` : '';
        return `<li><a href="${esc(f.href)}"${PRIVATE ? '' : ` download="${esc(f.name)}"`} target="_blank" rel="noopener">
          <span class="ext">${ext}</span><span class="lbl">${esc(f.label)}</span>
          <span class="name">${esc(f.name)}${size}</span></a></li>`;
      }
      // קובץ פרטי: נתיב בדרייב
      return `<li class="locked"><span class="path"><span class="ext">${ext}</span>
        <span class="lbl">${esc(f.label)}</span><span class="name">${esc(f.drivePath)}</span>
        <button class="copy" type="button" data-copy="${esc(f.drivePath)}">העתקת נתיב</button>
        ${f.missing ? '<span class="chip st-new">הקובץ לא נמצא</span>' : ''}</span></li>`;
    }).join('') + '</ul>';
  }

  function linkList(links) {
    if (!links || !links.length) return '';
    return '<ul>' + links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>
      ${l.shared === false ? ' <span class="chip st-new">עוד לא משותפת</span>' : ''}</li>`).join('') + '</ul>';
  }

  // numbered: בכיתה שבה יש מסלול של שיעורים (י׳) מספר השיעור מופיע בעיגול. where: בחיפוש, איפה הפריט יושב
  function itemHtml(it, open, numbered, where) {
    const chips = [
      where ? `<span class="chip where">${esc(where)}</span>` : '',
      `<span class="chip kind">${esc(it.kind)}</span>`,
      it.status ? `<span class="chip ${STATUS_CLASS[it.status] || 'st-new'}">${esc(it.status)}</span>` : '',
      // שם בעברית ("עיצוב מותנה") בגופן הרגיל ומימין לשמאל, שם של פונקציה בגופן של נוסחה
      ...(it.functions || []).map((f) => `<span class="chip fn${/[א-ת]/.test(f) ? ' he' : ''}">${esc(f)}</span>`),
    ].join('');
    const sec = (h, inner) => (inner ? `<section><h3>${h}</h3>${inner}</section>` : '');
    const p = it.private;
    const privHtml = p ? `<div class="private">
        ${sec('איך הלך בכיתה', p.howItWent ? `<p>${rich(p.howItWent)}</p>` : '')}
        ${sec('מה לתקן בשנה הבאה', p.fixNextYear ? `<p>${rich(p.fixNextYear)}</p>` : '')}
        ${sec('הערות', p.notes ? `<p>${rich(p.notes)}</p>` : '')}
        ${sec('איך בונים מחדש', p.build ? `<p>${rich(p.build)}</p>` : '')}
        ${sec('קבצים פרטיים (בדרייב)', fileList(p.files))}
      </div>` : '';
    const isLesson = Number.isInteger(it.order) && it.kind === 'שיעור';
    const num = numbered ? `<span class="num${isLesson ? '' : ' dot'}">${isLesson ? it.order : ''}</span>` : '';
    return `<details class="item${numbered ? '' : ' nonum'}" id="${esc(it.id)}"${open ? ' open' : ''}>
      <summary>${num}
        <span class="head"><span class="title-row"><span class="title">${esc(it.title)}</span></span>
        <p class="summary">${rich(it.summary)}</p><span class="chips">${chips}</span></span></summary>
      <div class="body">
        ${sec('הסיפור', it.story ? `<p>${rich(it.story)}</p>` : '')}
        ${sec('מהלך', it.flow && it.flow.length ? '<ol>' + it.flow.map((x) => `<li>${rich(x)}</li>`).join('') + '</ol>' : '')}
        ${sec('המוקשים', it.traps && it.traps.length ? '<ul class="traps">' + it.traps.map((x) => `<li>${rich(x)}</li>`).join('') + '</ul>' : '')}
        ${sec('קבצים', fileList(it.files))}
        ${sec('קישורים', linkList(it.links))}
        ${privHtml}
        <div class="item-actions"><button class="copy" type="button" data-link="${esc(it.id)}">העתקת קישור לפריט</button></div>
      </div></details>`;
  }

  const sortItems = (a, b) => (a.order ?? 999) - (b.order ?? 999);
  const countLabel = (n) => (n === 1 ? 'פריט אחד' : `${n} פריטים`);

  // חלקים בתוך כיתה (יא: חלק א׳, חלק ב׳, מבחנים ותוכנית). הכתובת: #g11-a
  const secOf = (g, unitId) => (g.sections || []).find((s) => s.units.includes(unitId));
  const secHash = (g, s) => g.key + '-' + s.id;
  const byHash = {};
  C.grades.forEach((g) => (g.sections || []).forEach((s) => { byHash[secHash(g, s)] = { g, s }; }));

  // סרגל פנימי. בכיתה בלי חלקים (י׳) הוא מסלול, וליד כל יחידה טווח השיעורים שלה
  function sideHtml(g, units, here) {
    const path = !g.sections;
    const rows = units.map((u) => {
      const items = g.items.filter((it) => it.unit === u.id);
      let meta = countLabel(items.length);
      if (path) {
        const ls = items.filter((it) => it.kind === 'שיעור' && Number.isInteger(it.order)).map((it) => it.order);
        if (ls.length === 1) meta = 'שיעור ' + ls[0];
        else if (ls.length) meta = 'שיעורים ' + Math.min(...ls) + '–' + Math.max(...ls);
      }
      return '<li><a href="#' + esc(here) + '" data-unit="u-' + esc(g.key) + '-' + esc(u.id) + '">'
        + '<span class="s-title">' + esc(u.title) + '</span><span class="s-meta">' + meta + '</span></a></li>';
    }).join('');
    return '<aside class="side' + (path ? ' path' : '') + '" aria-label="נושאים">'
      + '<p class="side-h">' + (path ? 'המסלול של השנה' : 'הנושאים בחלק הזה') + '</p><ol>' + rows + '</ol></aside>';
  }

  function partsHtml(g, cur) {
    return '<nav class="parts" aria-label="חלקים">' + g.sections.map((s) => {
      const n = g.items.filter((it) => s.units.includes(it.unit)).length;
      return '<a href="#' + esc(secHash(g, s)) + '" data-tone="' + esc(s.tone || 'blue') + '"'
        + (s === cur ? ' aria-current="page"' : '') + '>'
        + '<span class="p-title">' + esc(s.title) + '</span>'
        + '<span class="p-sub">' + esc(s.sub || '') + ' · ' + countLabel(n) + '</span></a>';
    }).join('') + '</nav>';
  }

  function gradeHtml(g, sec, openId) {
    const numbered = !g.sections;
    const units = (sec ? sec.units.map((id) => g.units.find((u) => u.id === id)) : g.units)
      .filter((u) => u && g.items.some((it) => it.unit === u.id));
    const body = units.map((u) => {
      const items = g.items.filter((it) => it.unit === u.id).sort(sortItems);
      return '<section class="unit" id="u-' + esc(g.key) + '-' + esc(u.id) + '">'
        + '<div class="unit-h"><h2>' + esc(u.title) + '</h2><span class="u-count">' + countLabel(items.length) + '</span></div>'
        + (u.intro ? '<p class="unit-intro">' + rich(u.intro) + '</p>' : '')
        + '<div class="items">' + items.map((it) => itemHtml(it, it.id === openId, numbered)).join('') + '</div></section>';
    }).join('');
    const here = sec ? secHash(g, sec) : g.key;
    return '<p class="intro">' + rich(g.intro) + '</p>' + (sec ? partsHtml(g, sec) : '')
      + '<div class="layout">' + sideHtml(g, units, here) + '<div class="content">' + body + '</div></div>';
  }

  function searchHtml(q) {
    const nq = norm(q).split(/\s+/).filter(Boolean);
    let total = 0;
    const out = C.grades.map((g) => {
      const hits = g.items.filter((it) => nq.every((w) => haystack(it, g).includes(w))).sort(sortItems);
      total += hits.length;
      if (!hits.length) return '';
      return '<h2 class="grade-h">' + esc(g.gradeLabel) + ' · ' + countLabel(hits.length) + '</h2>'
        + '<div class="items">' + hits.map((it) => {
          const s = secOf(g, it.unit);
          return itemHtml(it, false, !g.sections, s ? s.title : '');
        }).join('') + '</div>';
    }).join('');
    return total ? out : '<p class="empty">לא נמצא פריט עם "' + esc(q) + '". אפשר לנסות שם של פונקציה, נושא או מילה מהסיפור.</p>';
  }

  function aboutHtml() {
    return `<div class="about">
      <h2>מה יש כאן</h2>
      <p>חומרי ההוראה של מגמת מידע ונתונים: כיתה י' (סדרת שיעורי תחנות באקסל) וכיתה יא (פונקציות, סטטיסטיקה ולומדות).
      לכל שיעור יש כרטיס: מה לומדים, הסיפור, מהלך השיעור, המוקשים, והקבצים להורדה.</p>
      <p>המוקשים הם הטעויות שהשיעור בנוי לתפוס. הם נאספו מהכיתה, ומשמשים כל מורה שמלמדת את הנושא.</p>
      <h2>מקרא הצבעים בקבצים</h2>
      <div class="legend"><span class="lg-fixed">טקסט כחול מודגש = נתון קבוע</span><span class="lg-cell">מילוי צהוב = כאן כותבים</span></div>
      <p>בכל קובץ תחנות יש לוח בקרה עם ניקוד חי עד 100. הפתרונות למורה נמצאים בקבצים נפרדים, ולא מתפרסמים כאן.</p>
      <h2>איך מוצאים</h2>
      <p>כותבים בשורת החיפוש שם של פונקציה (<code dir="ltr">COUNTIF</code>), נושא (אחוזים) או "מוקשים".
      החיפוש עובר על כל השכבות. לכל פריט יש כפתור "העתקת קישור", ששולח ישר אליו.</p>
      ${PRIVATE ? `<h2>הדף הפרטי</h2>
      <p>הדף הזה כולל גם את מה שלא מתפרסם: איך הלך בכיתה, מה לתקן בשנה הבאה, הערות, ונתיבים לפתרונות ולמבחנים בדרייב.
      ${C.driveUrl ? `<a href="${esc(C.driveUrl)}" target="_blank" rel="noopener">תיקיית המגמה בדרייב</a>.` : 'הקישור לתיקיית הדרייב יתווסף אחרי הגיבוי.'}</p>
      <p>האתר הציבורי: <a href="${esc(C.siteUrl)}" target="_blank" rel="noopener">${esc(C.siteUrl)}</a></p>` : ''}
      <h2>איך מעדכנים</h2>
      <p>המקור הוא קובצי הקטלוג בתיקייה <code>אתר המגמה/data</code>. אחרי שיעור חדש מוסיפים כרטיס, מריצים
      <code dir="ltr">node tools/build.mjs</code>, ודוחפים לגיטהאב. הפירוט ב-<code dir="ltr">CLAUDE.md</code> שבתיקיית האתר.</p>
    </div>`;
  }

  // הדגשה בסרגל של היחידה שגוללים בה
  let spy = null;
  function setupSpy() {
    if (spy) { spy.disconnect(); spy = null; }
    const links = [...app.querySelectorAll('.side a[data-unit]')];
    if (!links.length) return;
    const bar = app.querySelector('.side ol');
    const set = (id) => links.forEach((a) => {
      const on = a.dataset.unit === id;
      a.classList.toggle('on', on);
      // בטלפון הסרגל הוא פס אופקי: מזיזים אותו כך שהיחידה הפעילה תיראה
      if (on && bar.scrollWidth > bar.clientWidth + 2) {
        const ar = a.getBoundingClientRect(), br = bar.getBoundingClientRect();
        bar.scrollBy({ left: ar.left + ar.width / 2 - (br.left + br.width / 2), behavior: 'smooth' });
      }
    });
    set(links[0].dataset.unit);
    if (!('IntersectionObserver' in window)) return;
    spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) set(e.target.id); });
    }, { rootMargin: '-20% 0px -70% 0px' });
    app.querySelectorAll('.unit').forEach((u) => spy.observe(u));
  }

  let lastView = '';
  function route() {
    const q = document.getElementById('q').value.trim();
    const hash = decodeURIComponent(location.hash.slice(1));
    let gradeKey = C.grades[0].key, secId = null, openId = null, view = 'grade';
    if (hash === 'about') view = 'about';
    else if (byId[hash]) {
      gradeKey = byId[hash].g.key; openId = hash;
      const s = secOf(byId[hash].g, byId[hash].it.unit);
      if (s) secId = s.id;
    } else if (byHash[hash]) { gradeKey = byHash[hash].g.key; secId = byHash[hash].s.id; }
    else if (C.grades.some((g) => g.key === hash)) gradeKey = hash;
    if (q) view = 'search';

    const g = C.grades.find((x) => x.key === gradeKey);
    const sec = g.sections ? (g.sections.find((s) => s.id === secId) || g.sections[0]) : null;
    document.body.dataset.tone = view === 'grade' ? ((sec && sec.tone) || g.tone || 'blue') : 'blue';

    document.querySelectorAll('.tabs a').forEach((a) => {
      const cur = (view === 'about' && a.dataset.key === 'about') || (view === 'grade' && a.dataset.key === gradeKey);
      if (cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    app.innerHTML = view === 'about' ? aboutHtml() : view === 'search' ? searchHtml(q) : gradeHtml(g, sec, openId);
    setupSpy();
    const viewKey = view + gradeKey + (sec ? sec.id : '');
    if (openId) {
      const el = document.getElementById(openId);
      if (el) el.scrollIntoView({ block: 'start' });
    } else if (view === 'grade' && lastView && viewKey !== lastView) {
      // מעבר בין חלקים או כיתות: חוזרים לראש הרשימה אם גללנו מתחת לה
      const top = app.querySelector('.parts') || app;
      if (top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
    }
    lastView = viewKey;
  }

  // שלד הדף
  const hero = document.getElementById('hero');
  if (hero && window.HERO_SVG) hero.innerHTML = window.HERO_SVG;
  document.getElementById('tabs').innerHTML =
    C.grades.map((g) => `<a href="#${esc(g.key)}" data-key="${esc(g.key)}">${esc(g.gradeLabel)}</a>`).join('') +
    '<a href="#about" data-key="about">איך זה עובד</a>';
  document.getElementById('built').textContent = C.built ? `עודכן ${C.built}` : '';

  document.getElementById('q').addEventListener('input', route);
  window.addEventListener('hashchange', () => { document.getElementById('q').value = ''; route(); });
  document.addEventListener('click', (e) => {
    const unit = e.target.closest('[data-unit]');
    if (unit) {
      e.preventDefault();
      const el = document.getElementById(unit.dataset.unit);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const btn = e.target.closest('button.copy');
    if (!btn) return;
    const text = btn.dataset.copy || (PRIVATE ? (C.siteUrl + '#' + btn.dataset.link)
      : location.href.split('#')[0] + '#' + btn.dataset.link);
    const done = () => { const t = btn.textContent; btn.textContent = 'הועתק'; setTimeout(() => { btn.textContent = t; }, 1400); };
    // אם אין גישה ללוח: מציגים את הטקסט כדי שאפשר יהיה לסמן ולהעתיק ידנית
    const fallback = () => { btn.outerHTML = `<span class="mono" style="user-select:all;overflow-wrap:anywhere">${esc(text)}</span>`; };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (err) { fallback(); }
  });
  route();
})();
