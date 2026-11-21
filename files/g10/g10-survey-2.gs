/**
 * יוצר את טופס הסקר של השכבה מתוך הגיליון "🗳️ בונים סקר" (בוקר 19.11).
 * נוצר על ידי _build/build_survey_morning.py. כתובות התאים כאן תואמות לגיליון. לא להזיז שורות בגיליון.
 *
 * הרצה: מעלים את קובץ האקסל לדרייב ← פותחים בגוגל שיטס ← תוספים ← Apps Script ← מדביקים את הקובץ הזה ← שמירה
 *       ← בוחרים createSurvey ← הפעלה ← מאשרים הרשאות.
 * בסוף, ביומן הביצוע (Execution log): קישור לטופס, לשלוח לשכבה, וקישור לגיליון התשובות.
 */

const SHEET = '🗳️ בונים סקר';
const TOPIC = 'B8';
const QUESTIONS = [{"n": 1, "type": "מספר", "q": "B17"}, {"n": 2, "type": "רשימה", "q": "B22", "a": "B23"}, {"n": 3, "type": "כן או לא", "q": "B28"}, {"n": 4, "type": "מספר", "q": "B33"}, {"n": 5, "typeCell": "B38", "q": "B39", "a": "B40"}];

function createSurvey() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET) || ss.getSheets()[0];
  const v = (a) => String(sh.getRange(a).getDisplayValue()).trim();

  // קודם בודקים הכול, ורק אחר כך יוצרים טופס
  const items = [];
  const problems = [];
  for (const q of QUESTIONS) {
    const title = v(q.q);
    const type = q.typeCell ? v(q.typeCell) : q.type;
    if (!title) { problems.push('שאלה ' + q.n + ': אין טקסט לשאלה.'); continue; }
    if (type === 'מספר' || type === 'כן או לא') { items.push({ title, type }); continue; }
    if (type === 'רשימה') {
      const choices = [...new Set(v(q.a).split(/[,،]/).map((s) => s.trim()).filter(Boolean))];
      if (choices.length < 2) { problems.push('שאלה ' + q.n + ': ברשימה צריך לפחות שתי תשובות, עם פסיק ביניהן.'); continue; }
      items.push({ title, type, choices });
      continue;
    }
    problems.push('שאלה ' + q.n + ': לא נבחר סוג תשובה.');
  }
  if (problems.length) {
    Logger.log('הטופס לא נוצר. מה לתקן בגיליון:\n' + problems.join('\n'));
    return;
  }

  const topic = v(TOPIC);
  const form = FormApp.create('סקר השכבה' + (topic ? ': ' + topic : ''));
  form.setDescription('הסקר אנונימי, ולוקח דקה. מגמת מידע ונתונים תנתח את התשובות בשיעור אקסל.');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setConfirmationMessage('תודה! התשובה נשמרה.');
  for (const it of items) {
    if (it.type === 'מספר') {
      form.addTextItem().setTitle(it.title).setHelpText('מספר בלבד.')
        .setValidation(FormApp.createTextValidation().requireNumber().setHelpText('כתבו מספר בלבד').build())
        .setRequired(true);
    } else if (it.type === 'כן או לא') {
      form.addMultipleChoiceItem().setTitle(it.title).setChoiceValues(['כן', 'לא']).setRequired(true);
    } else {
      form.addMultipleChoiceItem().setTitle(it.title).setChoiceValues(it.choices).setRequired(true);
    }
  }

  const resp = SpreadsheetApp.create('סקר השכבה - תשובות');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, resp.getId());
  Logger.log('הטופס, לשלוח לשכבה: ' + form.getPublishedUrl());
  Logger.log('עריכת הטופס: ' + form.getEditUrl());
  Logger.log('גיליון התשובות: ' + resp.getUrl());
}
