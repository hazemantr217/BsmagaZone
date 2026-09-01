const assert = require('node:assert/strict');
const fs = require('node:fs');

const trackingSource = fs.readFileSync('shared/supabase-config.js', 'utf8');
const adminSource = fs.readFileSync('shared/admin.js', 'utf8');
const adminHtml = fs.readFileSync('admin.html', 'utf8');
const migration = fs.readFileSync(
    'supabase/migrations/20260901184500_secure_visitor_tracking.sql',
    'utf8'
);

assert.doesNotThrow(() => new Function(trackingSource));
assert.doesNotThrow(() => new Function(adminSource));
assert.match(trackingSource, /SESSION_TOKEN_KEY/);
assert.match(trackingSource, /x-bsmaga-session-token/);
assert.match(trackingSource, /getSessionSupabaseClient/);
assert.match(trackingSource, /keepalive:\s*true/);
assert.match(trackingSource, /pagehide/);
assert.match(migration, /owns_bsmaga_session/);
assert.match(migration, /client_token/);
assert.match(migration, /Visitors can update own session/);
assert.match(adminHtml, /id="auth-reset-request"/);
assert.match(adminHtml, /id="auth-recovery-form"/);
assert.doesNotMatch(adminHtml, /id="auth-email"[^>]*\svalue=/i);
assert.doesNotMatch(adminHtml, /id="auth-password"[^>]*\svalue=/i);
assert.match(adminSource, /resetPasswordForEmail/);
assert.match(adminSource, /PASSWORD_RECOVERY/);

for (const file of fs.readdirSync('.').filter(name => name.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(
        html,
        /@supabase\/supabase-js@2(?=[\"'])/,
        `${file} uses a floating Supabase SDK major version`
    );
}

console.log('BsmagaZone tracking and authentication security checks passed.');
