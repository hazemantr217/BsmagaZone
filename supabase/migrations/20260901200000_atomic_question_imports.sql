-- Atomic, duplicate-safe question imports with an auditable rollback path.
alter table public.questions
  alter column exam_id set not null,
  alter column type set not null,
  alter column sort_order set not null;

alter table public.questions
  drop constraint if exists questions_payload_check;

alter table public.questions
  add constraint questions_payload_check check (
    type in ('tf', 'mcq', 'essay')
    and char_length(btrim(text)) between 1 and 20000
    and char_length(correct_answer) <= 10000
    and (explanation is null or char_length(explanation) <= 30000)
    and case type
      when 'tf' then
        options is null
        and correct_answer in ('true', 'false')
      when 'mcq' then
        jsonb_typeof(options) = 'array'
        and jsonb_array_length(options) between 2 and 10
        and correct_answer ~ '^[0-9]+$'
        and correct_answer::integer between 0 and jsonb_array_length(options) - 1
      when 'essay' then
        options is null
      else false
    end
  );

create unique index if not exists idx_questions_exam_text_fingerprint
  on public.questions (
    exam_id,
    md5(regexp_replace(lower(btrim(text)), '\s+', ' ', 'g'))
  );

create table if not exists public.question_imports (
  id bigint generated always as identity primary key,
  exam_id integer not null references public.exams(id) on delete cascade,
  imported_by uuid references auth.users(id) on delete set null,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'txt', 'csv', 'json', 'xlsx', 'google_sheets')),
  source_name text
    check (source_name is null or char_length(source_name) <= 255),
  submitted_count integer not null check (submitted_count between 1 and 1000),
  inserted_count integer not null check (inserted_count between 0 and submitted_count),
  skipped_duplicates integer not null check (skipped_duplicates between 0 and submitted_count),
  question_ids integer[] not null default array[]::integer[],
  created_at timestamptz not null default now(),
  rolled_back_at timestamptz,
  rolled_back_by uuid references auth.users(id) on delete set null,
  constraint question_imports_counts_check
    check (inserted_count + skipped_duplicates = submitted_count)
);

create index if not exists idx_question_imports_exam_created
  on public.question_imports (exam_id, created_at desc);

alter table public.question_imports enable row level security;

drop policy if exists question_imports_admin_read on public.question_imports;
create policy question_imports_admin_read
  on public.question_imports
  for select
  to authenticated
  using (security.is_bsmaga_admin());

revoke all on table public.question_imports from anon, authenticated;
grant select on table public.question_imports to authenticated;

create or replace function security.import_bsmaga_questions(
  p_exam_id integer,
  p_questions jsonb,
  p_source_type text default 'manual',
  p_source_name text default null
)
returns table (
  import_id bigint,
  submitted_count integer,
  inserted_count integer,
  skipped_duplicates integer
)
language plpgsql
security definer
set search_path = pg_catalog
set statement_timeout = '15s'
as $function$
declare
  v_item jsonb;
  v_option jsonb;
  v_options jsonb;
  v_clean jsonb := '[]'::jsonb;
  v_row_no integer := 0;
  v_submitted integer;
  v_inserted integer;
  v_sort_order integer;
  v_type text;
  v_text text;
  v_answer text;
  v_explanation text;
  v_source_type text;
  v_source_name text;
  v_question_ids integer[];
  v_import_id bigint;
begin
  if not security.is_bsmaga_admin() then
    raise exception using
      errcode = '42501',
      message = 'غير مصرح لك باستيراد الأسئلة.';
  end if;

  if p_exam_id is null or not exists (
    select 1 from public.exams where id = p_exam_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'الامتحان المحدد غير موجود.';
  end if;

  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'بيانات الأسئلة يجب أن تكون قائمة JSON.';
  end if;

  v_submitted := jsonb_array_length(p_questions);
  if v_submitted < 1 or v_submitted > 1000 then
    raise exception using
      errcode = '22023',
      message = 'يمكن استيراد من سؤال واحد إلى 1000 سؤال في العملية الواحدة.';
  end if;

  v_source_type := lower(btrim(coalesce(nullif(p_source_type, ''), 'manual')));
  if v_source_type not in ('manual', 'txt', 'csv', 'json', 'xlsx', 'google_sheets') then
    raise exception using
      errcode = '22023',
      message = 'نوع مصدر الاستيراد غير مدعوم.';
  end if;

  v_source_name := nullif(btrim(p_source_name), '');
  if v_source_name is not null and char_length(v_source_name) > 255 then
    raise exception using
      errcode = '22023',
      message = 'اسم مصدر الاستيراد أطول من الحد المسموح.';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_questions)
  loop
    v_row_no := v_row_no + 1;

    if jsonb_typeof(v_item) <> 'object' then
      raise exception using
        errcode = '22023',
        message = format('الصف %s ليس سؤالاً صالحًا.', v_row_no);
    end if;

    v_type := lower(btrim(coalesce(v_item ->> 'type', '')));
    v_text := btrim(coalesce(v_item ->> 'text', ''));
    v_answer := btrim(coalesce(v_item ->> 'correct_answer', ''));
    v_explanation := nullif(btrim(v_item ->> 'explanation'), '');

    if v_type not in ('tf', 'mcq', 'essay') then
      raise exception using
        errcode = '22023',
        message = format('نوع السؤال في الصف %s غير مدعوم.', v_row_no);
    end if;

    if char_length(v_text) < 1 or char_length(v_text) > 20000 then
      raise exception using
        errcode = '22023',
        message = format('نص السؤال في الصف %s فارغ أو أطول من الحد المسموح.', v_row_no);
    end if;

    if char_length(v_answer) > 10000 then
      raise exception using
        errcode = '22023',
        message = format('الإجابة في الصف %s أطول من الحد المسموح.', v_row_no);
    end if;

    if v_explanation is not null and char_length(v_explanation) > 30000 then
      raise exception using
        errcode = '22023',
        message = format('التعليل في الصف %s أطول من الحد المسموح.', v_row_no);
    end if;

    begin
      v_sort_order := coalesce(
        nullif(btrim(v_item ->> 'sort_order'), '')::integer,
        v_row_no
      );
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using
          errcode = '22023',
          message = format('ترتيب السؤال في الصف %s غير صالح.', v_row_no);
    end;

    if v_sort_order < 0 or v_sort_order > 1000000 then
      raise exception using
        errcode = '22023',
        message = format('ترتيب السؤال في الصف %s خارج النطاق المسموح.', v_row_no);
    end if;

    if v_type = 'tf' then
      v_answer := lower(v_answer);
      if v_answer not in ('true', 'false') then
        raise exception using
          errcode = '22023',
          message = format('إجابة الصح والخطأ في الصف %s يجب أن تكون true أو false.', v_row_no);
      end if;
      v_options := null;

    elsif v_type = 'mcq' then
      v_options := v_item -> 'options';
      if v_options is null
         or jsonb_typeof(v_options) <> 'array'
         or jsonb_array_length(v_options) < 2
         or jsonb_array_length(v_options) > 10 then
        raise exception using
          errcode = '22023',
          message = format('اختيارات السؤال في الصف %s يجب أن تكون قائمة من 2 إلى 10 اختيارات.', v_row_no);
      end if;

      for v_option in
        select value from jsonb_array_elements(v_options)
      loop
        if jsonb_typeof(v_option) <> 'string'
           or char_length(btrim(v_option #>> '{}')) < 1
           or char_length(btrim(v_option #>> '{}')) > 1000 then
          raise exception using
            errcode = '22023',
            message = format('أحد اختيارات السؤال في الصف %s فارغ أو غير صالح.', v_row_no);
        end if;
      end loop;

      select jsonb_agg(to_jsonb(btrim(option_text)) order by option_no)
      into v_options
      from jsonb_array_elements_text(v_options) with ordinality as option_row(option_text, option_no);

      if v_answer !~ '^[0-9]+$'
         or v_answer::integer < 0
         or v_answer::integer >= jsonb_array_length(v_options) then
        raise exception using
          errcode = '22023',
          message = format('رقم الإجابة الصحيحة في الصف %s خارج نطاق الاختيارات.', v_row_no);
      end if;

    else
      v_options := null;
    end if;

    v_clean := v_clean || jsonb_build_array(
      jsonb_build_object(
        'type', v_type,
        'text', v_text,
        'options', v_options,
        'correct_answer', v_answer,
        'explanation', v_explanation,
        'sort_order', v_sort_order
      )
    );
  end loop;

  -- Serialize imports only within the same exam and release at transaction end.
  perform pg_advisory_xact_lock(77901, p_exam_id);

  with parsed as (
    select
      value ->> 'type' as type,
      value ->> 'text' as text,
      case
        when value ->> 'type' = 'mcq' then value -> 'options'
        else null::jsonb
      end as options,
      value ->> 'correct_answer' as correct_answer,
      nullif(value ->> 'explanation', '') as explanation,
      (value ->> 'sort_order')::integer as sort_order,
      ordinality,
      md5(regexp_replace(lower(btrim(value ->> 'text')), '\s+', ' ', 'g')) as fingerprint
    from jsonb_array_elements(v_clean) with ordinality as imported(value, ordinality)
  ),
  deduplicated as (
    select distinct on (fingerprint)
      type, text, options, correct_answer, explanation, sort_order, ordinality
    from parsed
    order by fingerprint, ordinality
  ),
  inserted as (
    insert into public.questions (
      exam_id, type, text, options, correct_answer, explanation, sort_order
    )
    select
      p_exam_id, type, text, options, correct_answer, explanation, sort_order
    from deduplicated
    order by ordinality
    on conflict do nothing
    returning id
  )
  select
    coalesce(array_agg(id order by id), array[]::integer[]),
    count(*)::integer
  into v_question_ids, v_inserted
  from inserted;

  insert into public.question_imports (
    exam_id,
    imported_by,
    source_type,
    source_name,
    submitted_count,
    inserted_count,
    skipped_duplicates,
    question_ids
  )
  values (
    p_exam_id,
    auth.uid(),
    v_source_type,
    v_source_name,
    v_submitted,
    v_inserted,
    v_submitted - v_inserted,
    v_question_ids
  )
  returning id into v_import_id;

  update public.exams
  set questions_count = (
    select count(*)::integer
    from public.questions
    where exam_id = p_exam_id
  )
  where id = p_exam_id;

  return query
  select v_import_id, v_submitted, v_inserted, v_submitted - v_inserted;
end;
$function$;

create or replace function security.rollback_bsmaga_question_import(
  p_import_id bigint
)
returns table (
  import_id bigint,
  deleted_count integer
)
language plpgsql
security definer
set search_path = pg_catalog
set statement_timeout = '15s'
as $function$
declare
  v_exam_id integer;
  v_question_ids integer[];
  v_deleted integer;
begin
  if not security.is_bsmaga_admin() then
    raise exception using
      errcode = '42501',
      message = 'غير مصرح لك بالتراجع عن الاستيراد.';
  end if;

  select exam_id
  into v_exam_id
  from public.question_imports
  where id = p_import_id;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'عملية الاستيراد غير موجودة.';
  end if;

  perform pg_advisory_xact_lock(77901, v_exam_id);

  select question_ids
  into v_question_ids
  from public.question_imports
  where id = p_import_id
    and rolled_back_at is null
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'تم التراجع عن عملية الاستيراد من قبل.';
  end if;

  delete from public.questions
  where exam_id = v_exam_id
    and id = any(v_question_ids);

  get diagnostics v_deleted = row_count;

  update public.question_imports
  set rolled_back_at = now(),
      rolled_back_by = auth.uid()
  where id = p_import_id;

  update public.exams
  set questions_count = (
    select count(*)::integer
    from public.questions
    where exam_id = v_exam_id
  )
  where id = v_exam_id;

  return query select p_import_id, v_deleted;
end;
$function$;

revoke all on function security.import_bsmaga_questions(integer, jsonb, text, text) from public;
revoke all on function security.rollback_bsmaga_question_import(bigint) from public;

create or replace function public.import_questions_atomic(
  p_exam_id integer,
  p_questions jsonb,
  p_source_type text default 'manual',
  p_source_name text default null
)
returns table (
  import_id bigint,
  submitted_count integer,
  inserted_count integer,
  skipped_duplicates integer
)
language sql
security definer
set search_path = pg_catalog
as $function$
  select *
  from security.import_bsmaga_questions(
    p_exam_id,
    p_questions,
    p_source_type,
    p_source_name
  );
$function$;

create or replace function public.rollback_question_import(
  p_import_id bigint
)
returns table (
  import_id bigint,
  deleted_count integer
)
language sql
security definer
set search_path = pg_catalog
as $function$
  select *
  from security.rollback_bsmaga_question_import(p_import_id);
$function$;

revoke all on function public.import_questions_atomic(integer, jsonb, text, text)
  from public, anon;
revoke all on function public.rollback_question_import(bigint)
  from public, anon;

grant execute on function public.import_questions_atomic(integer, jsonb, text, text)
  to authenticated;
grant execute on function public.rollback_question_import(bigint)
  to authenticated;
