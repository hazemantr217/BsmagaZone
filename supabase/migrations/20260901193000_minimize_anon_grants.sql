-- Removes legacy anonymous write grants; RLS remains the second enforcement layer.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon;

revoke all privileges on table
  public.universities,
  public.faculties,
  public.academic_years,
  public.semesters,
  public.subjects,
  public.exams,
  public.questions,
  public.review_materials
from anon;

grant select on table
  public.universities,
  public.faculties,
  public.academic_years,
  public.semesters,
  public.subjects,
  public.exams,
  public.questions,
  public.review_materials
to anon;

revoke all privileges on table public.student_sessions from anon;
grant select, insert on table public.student_sessions to anon;
grant update (student_name, last_visit) on table public.student_sessions to anon;

revoke all privileges on table public.page_visits from anon;
grant select, insert on table public.page_visits to anon;
grant update (time_on_page_seconds) on table public.page_visits to anon;

revoke all privileges on table public.exam_results from anon;
grant insert on table public.exam_results to anon;

revoke all privileges on all sequences in schema public from anon;
grant usage, select on sequence public.page_visits_id_seq to anon;
