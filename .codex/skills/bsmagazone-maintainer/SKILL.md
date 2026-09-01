---
name: bsmagazone-maintainer
description: Maintain and extend hazemantr217/BsmagaZone on updates-V2, including its static frontend, Supabase schema and RLS, atomic question imports, revision features, security checks, tests, and Vercel previews. Use whenever inspecting, fixing, developing, migrating, testing, or deploying BsmagaZone.
---

# BsmagaZone maintainer

## Product contract

BsmagaZone is a general Arabic study and revision platform. It is intentionally not a formal exam system. A learner should see whether an answer is correct immediately and may see its explanation; do not remove this behavior as an anti-cheating measure.

The target academic model is:

`university -> faculty -> optional department/program -> year -> semester -> subject -> exam/review -> question`

Do not hard-code Alexandria University, Social Work, a particular year, or a particular subject into reusable flows.

## Non-negotiable repository rules

- Repository: `hazemantr217/BsmagaZone`.
- Development branch: `updates-V2` only.
- Treat `main` as an untouched legacy/stable reference. Reading it for comparison is allowed; writing, merging, or deploying it requires a new explicit instruction from the owner.
- Recovery branch created before the rebuild: `backup/updates-v2-pre-rebuild-2026-09-01`.
- Supabase project: `vdxkzgccwuojjkxmebdx`.
- Vercel project: `prj_j06qsHOxwH4zkMij6ixjpd7j0Dmj` under team `team_46iT8N2hGBAStQARrIQ1sIfT`.
- Never commit credentials, passwords, service-role keys, private API keys, or database connection strings.
- Never silently discard user data or unrelated worktree changes.

## Start every task here

1. Read this file and root `AGENTS.md`.
2. Confirm the repository and active branch with `git status --short --branch`; stop if it is not `updates-V2` or a worktree based on it.
3. Fetch and inspect the current remote branch. Do not rely on a recorded SHA in an old conversation.
4. Inspect relevant HTML/JS, tests, and all migrations touching the feature.
5. For database work, inspect the live project schema, policies, migration history, and advisors before writing SQL.
6. State the intended data and security impact before a destructive or irreversible operation.

## Code map

- `index.html`: entry and academic browsing.
- `subject.html`: dynamic subject page and its exams/reviews.
- `exam.html` plus `shared/exam.js`: question/revision experience and immediate feedback.
- `review.html`: review-material experience.
- `admin.html`, `shared/admin.js`, `shared/admin.css`: authenticated content administration and bulk import UI.
- `shared/supabase-config.js`: public Supabase client configuration only. The anon key may be public; privileged keys may not.
- `shared/styles.css`: shared public styling.
- `supabase/migrations/`: source-controlled schema, functions, policies, grants, and indexes.
- `tests/`: executable regression and security checks.
- Legacy subject/exam HTML files remain compatibility material; prefer the dynamic pages for new features.

Before changing a file, search for every consumer. Shared scripts affect multiple pages.

## Current implemented foundation

- Admin access is owner-controlled; public sign-up must never grant administration.
- Academic content is generalized beyond one university or faculty.
- Review materials can be managed per subject.
- Question imports support TXT, CSV, JSON, XLS/XLSX, and Google Sheets with preview and validation.
- Imports are atomic through `import_questions_atomic`, audited in `question_imports`, duplicate-protected, and reversible through `rollback_question_import`.
- Anonymous academic access is read-oriented. Anonymous result/tracking writes are deliberately narrow and must not become general table-write access.
- Visitor tracking is constrained and must not allow arbitrary row modification.
- The current migration sequence includes the tracking hardening, anon grant minimization, atomic imports, and import actor indexes. Inspect the directory and live migration history for anything newer.

## Supabase and security procedure

- Put every schema or policy change in a new timestamped migration; never edit an already-applied migration to disguise drift.
- Enable RLS on every exposed table. A logged-in user is not automatically an admin.
- Base authorization on trusted database state, never `user_metadata` or client-supplied flags.
- An update policy normally needs both `USING` and `WITH CHECK`.
- Keep privileged `SECURITY DEFINER` functions tightly scoped, with a fixed `search_path`, explicit owner/admin checks, and revoked public/anon execution unless required.
- Prefer server-side/RPC validation for multi-row or privileged writes. Never trust grades, correct answers, ownership, or audit identity supplied by the browser.
- Use transactions for imports so partial files cannot persist.
- Back up and verify actual data before destructive migrations, constraint rewrites, or mass updates.
- Apply the migration, retest permissions as anon/authenticated/admin, and run Supabase security and performance advisors.
- Keep the Supabase browser library pinned to a reviewed version.

Some advisor warnings may reflect intentionally exposed authenticated RPC wrappers. Do not suppress them blindly: prove anon execution is revoked, the internal function checks `security.is_bsmaga_admin()`, and a non-admin call fails.

## Frontend rules

- Escape imported/user content before rendering; never insert untrusted text as HTML.
- Preserve Arabic RTL behavior and mobile usability.
- Keep immediate answer feedback and explanations.
- Preserve old links when consolidating static pages; introduce redirects or compatibility handling rather than breaking shared URLs.
- Do not put Gemini or other provider secrets in client JavaScript. PDF/Word/image extraction must go through a protected server endpoint with quotas, validation, and an explicit key configuration.

## Required verification

Run all repository tests:

```bash
for test_file in tests/*.test.js; do node "$test_file"; done
```

For UI changes, verify at minimum:

- home -> university/faculty/year/semester -> subject;
- subject -> exam/review;
- correct and incorrect answers show immediate safe feedback;
- admin login rejects a normal authenticated user;
- create/edit/delete relevant content;
- import preview, invalid-row reporting, successful atomic import, duplicate handling, and rollback;
- mobile RTL layout and browser console errors.

For database changes, also run live RLS probes and Supabase advisors. Remove any probe data after verifying it is safe to do so.

## Delivery and deployment

1. Make the smallest coherent change on `updates-V2`.
2. Run local tests and security probes.
3. Commit with a descriptive message and push without force.
4. Wait for the Vercel Preview to become ready; inspect build logs and test the actual Preview URL.
5. Report changed files, migrations, test results, Preview URL, risks, and rollback path.
6. Do not merge or deploy `main` without explicit owner approval.

A Supabase keepalive check already exists for both projects. Do not create a duplicate scheduler. Keepalive must execute a harmless read-only database query and must not expose secrets.

## Roadmap order

Unless the owner reprioritizes:

1. Review modes: wrong answers, favorites, random sets, progress, and flashcards.
2. Stronger content/search/sharing flows.
3. Protected PDF/Word/image-to-questions extraction using Gemini.
4. Gradual TypeScript/Next.js migration after current behavior is covered by tests.

## Stop and ask before proceeding

Stop for explicit approval if a task would touch `main`, delete or rewrite production data, weaken RLS/admin checks, publish to production, rotate credentials, add paid infrastructure, or change the immediate-feedback study behavior.
