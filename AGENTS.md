# BsmagaZone agent entry point

Before changing anything, read `.codex/skills/bsmagazone-maintainer/SKILL.md` in full.

Mandatory rules:

- Work on `updates-V2` only. Do not edit, merge into, or deploy `main` unless the owner explicitly changes this rule.
- This is a study and revision platform, not a real examination system. Preserve immediate answer feedback and explanations.
- Supabase project: `vdxkzgccwuojjkxmebdx`. Never expose a service-role key, password, or privileged secret in browser code, Git, logs, or documentation.
- Preserve existing data. Database changes must be additive, timestamped migrations under `supabase/migrations/`, with RLS and rollback impact reviewed.
- Run every test in `tests/` before handing off. Use a Vercel Preview for verification; production publication requires explicit approval.
- Do not undo unrelated user changes. Inspect the current branch, migrations, and live schema before assuming this document is current.

Delivery flow:

`request -> inspect updates-V2 and Supabase -> make a recoverable change -> run tests/security checks -> Vercel Preview -> owner approval -> publication`
