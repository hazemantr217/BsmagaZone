-- Cover audit actor foreign keys for user deletion and admin-history lookups.
create index if not exists idx_question_imports_imported_by
  on public.question_imports (imported_by)
  where imported_by is not null;

create index if not exists idx_question_imports_rolled_back_by
  on public.question_imports (rolled_back_by)
  where rolled_back_by is not null;
