const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync(
    'supabase/migrations/20260901200000_atomic_question_imports.sql',
    'utf8'
);

assert.match(migration, /create unique index if not exists idx_questions_exam_text_fingerprint/i);
assert.match(migration, /create table if not exists public\.question_imports/i);
assert.match(migration, /alter table public\.question_imports enable row level security/i);
assert.match(migration, /using \(security\.is_bsmaga_admin\(\)\)/i);
assert.match(migration, /pg_advisory_xact_lock\(77901, p_exam_id\)/i);
assert.match(migration, /insert into public\.questions[\s\S]*on conflict do nothing[\s\S]*returning id/i);
assert.match(migration, /set search_path = pg_catalog/gi);
assert.match(migration, /revoke all on function public\.import_questions_atomic[\s\S]*from public, anon/i);
assert.match(migration, /grant execute on function public\.import_questions_atomic[\s\S]*to authenticated/i);
assert.match(migration, /create or replace function public\.rollback_question_import/i);
assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);

console.log('Atomic import migration security checks passed.');
