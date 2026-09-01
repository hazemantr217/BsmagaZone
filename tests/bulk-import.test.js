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

console.log('Bulk import parser tests passed.');
