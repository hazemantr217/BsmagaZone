-- Mirrors the reviewed migration applied to the BsmagaZone Supabase project.
alter table public.student_sessions
  add column if not exists client_token uuid not null default gen_random_uuid();

create unique index if not exists idx_student_sessions_client_token
  on public.student_sessions (client_token);

alter table public.student_sessions
  drop constraint if exists student_sessions_payload_check;
alter table public.student_sessions
  add constraint student_sessions_payload_check check (
    (student_name is null or char_length(student_name) between 1 and 150)
    and (fingerprint is null or char_length(fingerprint) <= 256)
    and (device_type is null or char_length(device_type) <= 40)
    and (browser is null or char_length(browser) <= 120)
    and (ip_country is null or char_length(ip_country) <= 80)
  );

alter table public.exam_results
  drop constraint if exists exam_results_values_check;
alter table public.exam_results
  add constraint exam_results_values_check check (
    total_questions between 1 and 1000
    and score between 0 and total_questions
    and percentage between 0 and 100
    and (time_spent_seconds is null or time_spent_seconds between 0 and 86400)
    and completed_at >= started_at
    and (answers is null or pg_column_size(answers) <= 262144)
  );

alter table public.page_visits
  drop constraint if exists page_visits_values_check;
alter table public.page_visits
  add constraint page_visits_values_check check (
    char_length(page_name) between 1 and 160
    and (page_type is null or char_length(page_type) <= 40)
    and (time_on_page_seconds is null or time_on_page_seconds between 0 and 86400)
  );

grant usage on schema security to anon;

create or replace function security.bsmaga_request_header(header_name text)
returns text
language sql
stable
set search_path = pg_catalog
as $function$
  select (
    coalesce(
      nullif(current_setting('request.headers', true), ''),
      '{}'
    )::jsonb ->> lower(header_name)
  );
$function$;

revoke all on function security.bsmaga_request_header(text) from public;
grant execute on function security.bsmaga_request_header(text) to anon, authenticated;

create or replace function security.owns_bsmaga_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.student_sessions as visitor_session
    where visitor_session.id = target_session_id
      and visitor_session.id::text = security.bsmaga_request_header('x-bsmaga-session-id')
      and visitor_session.client_token::text = security.bsmaga_request_header('x-bsmaga-session-token')
  );
$function$;

revoke all on function security.owns_bsmaga_session(uuid) from public;
grant execute on function security.owns_bsmaga_session(uuid) to anon, authenticated;

drop policy if exists "Anyone can create sessions" on public.student_sessions;
create policy "Visitors can create owned sessions"
on public.student_sessions
for insert
to anon
with check (
  id::text = security.bsmaga_request_header('x-bsmaga-session-id')
  and client_token::text = security.bsmaga_request_header('x-bsmaga-session-token')
);

drop policy if exists "Visitors can read own session" on public.student_sessions;
create policy "Visitors can read own session"
on public.student_sessions
for select
to anon
using ((select security.owns_bsmaga_session(id)));

drop policy if exists "Visitors can refresh sessions" on public.student_sessions;
create policy "Visitors can update own session"
on public.student_sessions
for update
to anon
using ((select security.owns_bsmaga_session(id)))
with check ((select security.owns_bsmaga_session(id)));

revoke update on public.student_sessions from anon, authenticated;
grant select, insert on public.student_sessions to anon;
grant update (student_name, last_visit) on public.student_sessions to anon;

drop policy if exists "Anyone can insert visits" on public.page_visits;
create policy "Visitors can insert own visits"
on public.page_visits
for insert
to anon
with check ((select security.owns_bsmaga_session(session_id)));

drop policy if exists "Visitors can read own visits" on public.page_visits;
create policy "Visitors can read own visits"
on public.page_visits
for select
to anon
using ((select security.owns_bsmaga_session(session_id)));

drop policy if exists "Visitors can update own visits" on public.page_visits;
create policy "Visitors can update own visits"
on public.page_visits
for update
to anon
using ((select security.owns_bsmaga_session(session_id)))
with check ((select security.owns_bsmaga_session(session_id)));

revoke update on public.page_visits from anon, authenticated;
grant select, insert on public.page_visits to anon;
grant update (time_on_page_seconds) on public.page_visits to anon;
grant usage, select on sequence public.page_visits_id_seq to anon;

drop policy if exists "Anyone can insert results" on public.exam_results;
create policy "Visitors can insert own results"
on public.exam_results
for insert
to anon
with check (
  (select security.owns_bsmaga_session(session_id))
  and exists (
    select 1
    from public.exams as linked_exam
    where linked_exam.id = exam_id
      and linked_exam.subject_id = subject_id
  )
);

grant insert on public.exam_results to anon;
