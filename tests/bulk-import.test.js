const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('shared/admin.js', 'utf8');
const context = {
    console,
    setTimeout,
    clearTimeout,
    window: { setTimeout },
    document: { addEventListener() {} },
    sessionStorage: { getItem() { return null; }, setItem() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    Blob,
    URL
};

vm.createContext(context);
vm.runInContext(source, context);

const csv = `type,text,options,correct_answer,explanation,sort_order
tf,الأرض كروية,,صح,معلومة علمية,1
mcq,كم يساوي 1+1؟,1|2|3|4,ب,الإجابة هي 2,2
essay,اشرح الفكرة,,,إجابة نموذجية,3`;

const parsedCsv = context.parseBulkInput(csv);
const validatedCsv = context.validateBulkQuestions(parsedCsv);
assert.equal(validatedCsv.errors.length, 0);
assert.equal(validatedCsv.valid.length, 3);
assert.equal(validatedCsv.valid[1].correct_answer, '1');
assert.equal(validatedCsv.valid[0].source_row, 2);

const json = JSON.stringify([
    { type: 'tf', text: 'اختبار', correct_answer: 'خطأ', explanation: 'تعليل' }
]);
const parsedJson = context.parseBulkInput(json);
assert.equal(parsedJson[0].correct_answer, 'false');

const invalid = context.validateBulkQuestions([
    { type: 'mcq', text: 'سؤال', options: ['أ'], correct_answer: '4', explanation: '', sort_order: 1 }
]);
assert.equal(invalid.valid.length, 0);
assert.equal(invalid.errors.length, 1);

const arabicCsv = `نوع السؤال,نص السؤال,اختيار 1,اختيار 2,اختيار 3,الإجابة الصحيحة,التعليل,ترتيب
اختيار من متعدد,اختر الإجابة,الأول,الثاني,الثالث,ب,تعليل,7`;
const parsedArabicCsv = context.parseBulkInput(arabicCsv);
assert.equal(parsedArabicCsv.length, 1);
assert.deepEqual(Array.from(parsedArabicCsv[0].options), ['الأول', 'الثاني', 'الثالث']);
assert.equal(parsedArabicCsv[0].correct_answer, '1');
assert.equal(parsedArabicCsv[0].sort_order, 7);

const duplicates = context.validateBulkQuestions(context.normalizeImportedQuestions([
    { type: 'tf', text: 'نفس   السؤال', correct_answer: 'صح' },
    { type: 'tf', text: '  نفس السؤال ', correct_answer: 'صح' }
]));
assert.equal(duplicates.valid.length, 1);
assert.equal(duplicates.errors.length, 1);
assert.match(duplicates.errors[0], /مكرر/);

assert.equal(
    context.parseGoogleSheetUrl('https://docs.google.com/spreadsheets/d/example_sheet-123/edit#gid=42').gid,
    '42'
);
assert.equal(context.escapeAdminHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');

assert.match(source, /\.rpc\('import_questions_atomic'/);
assert.match(source, /\.rpc\('rollback_question_import'/);
assert.doesNotMatch(source, /from\('questions'\)\.insert\(batch\)/);

const adminHtml = fs.readFileSync('admin.html', 'utf8');
assert.match(adminHtml, /xlsx-0\.20\.3\/package\/dist\/xlsx\.full\.min\.js/);
assert.match(adminHtml, /accept="[^"]*\.xlsx[^"]*\.xls/);
assert.match(adminHtml, /id="bulk-google-sheet-url"/);
assert.match(adminHtml, /id="bulk-import-history-list"/);

console.log('Bulk import parser tests passed.');
