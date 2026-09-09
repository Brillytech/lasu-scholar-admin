-- ============================================================================
-- 001_theory_questions.sql
--
-- Adds free-response ("theory") questions, linked to a topic the same way MCQ
-- questions in `public.questions` are.
--
-- Run this in the Supabase SQL editor (this project is not migration-managed:
-- there is no supabase/migrations history, so `supabase db push` is not used).
-- The whole script is idempotent and safe to re-run.
--
-- Content is stored as TipTap HTML. Math is embedded inline as
--   <span data-type="inline-math" data-latex="\frac{a}{b}"></span>
-- and re-rendered with KaTeX on display. The *_text columns hold a plain-text
-- mirror so list previews and ILIKE search never have to strip tags.
--
-- SECURITY NOTE: writes are gated on an admin role check, matching the pattern
-- already used by app_reviews and notifications. This intentionally does NOT
-- mirror public.questions, whose write policies have no role check at all.
-- ============================================================================


-- Wrapped in a transaction: Postgres DDL is transactional, so a failure
-- part-way through rolls the whole thing back rather than leaving a
-- half-created table behind.
begin;


-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.theory_questions (
  id          uuid primary key default gen_random_uuid(),

  -- Both ids are stored even though topic implies course. This matches
  -- public.questions, and the service layer filters on course_ids/topic_ids.
  course_id   uuid not null references public.courses(id) on delete cascade,
  topic_id    uuid not null references public.topics(id)  on delete cascade,

  question_html text not null,
  question_text text not null default '',

  answer_html   text,
  answer_text   text default '',

  marks         integer,
  difficulty    text    not null default 'standard',
  position      integer not null default 0,

  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint theory_questions_marks_non_negative
    check (marks is null or marks >= 0)
);

comment on table  public.theory_questions              is 'Free-response questions per topic. Companion to public.questions (MCQ).';
comment on column public.theory_questions.question_html is 'TipTap HTML. Math as <span data-type="inline-math" data-latex="...">. Sanitize before rendering.';
comment on column public.theory_questions.question_text is 'Plain-text mirror of question_html, for list previews and search.';
comment on column public.theory_questions.answer_html   is 'Optional model/sample answer, same HTML format as question_html.';
comment on column public.theory_questions.position      is 'Manual ordering within a topic; ties broken by created_at.';


-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
create index if not exists theory_questions_topic_idx
  on public.theory_questions (topic_id);

create index if not exists theory_questions_course_idx
  on public.theory_questions (course_id);

-- Serves the default list order: questions of a topic, in display order.
create index if not exists theory_questions_topic_position_idx
  on public.theory_questions (topic_id, position, created_at desc);


-- ---------------------------------------------------------------------------
-- 3. updated_at trigger
--
-- Deliberately scoped to this feature rather than a generic public.set_updated_at(),
-- so this script cannot clobber an existing shared trigger function.
-- ---------------------------------------------------------------------------
create or replace function public.theory_questions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists theory_questions_set_updated_at on public.theory_questions;

create trigger theory_questions_set_updated_at
  before update on public.theory_questions
  for each row
  execute function public.theory_questions_set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. Grants
--
-- No grants to `anon`: this table is authenticated-only. RLS below does the
-- real gating; these grants just make the script self-contained regardless of
-- the project's default privileges.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.theory_questions to authenticated;


-- ---------------------------------------------------------------------------
-- 5. Row Level Security
--
-- SELECT : any authenticated user (the student app will read these later).
-- WRITE  : admin / super_admin only, using the same EXISTS check as
--          app_reviews and notifications.
-- ---------------------------------------------------------------------------
alter table public.theory_questions enable row level security;

drop policy if exists "theory_questions_select_authenticated" on public.theory_questions;
drop policy if exists "theory_questions_insert_admin"         on public.theory_questions;
drop policy if exists "theory_questions_update_admin"         on public.theory_questions;
drop policy if exists "theory_questions_delete_admin"         on public.theory_questions;

create policy "theory_questions_select_authenticated"
  on public.theory_questions
  for select
  to authenticated
  using (true);

create policy "theory_questions_insert_admin"
  on public.theory_questions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['admin', 'super_admin'])
    )
  );

create policy "theory_questions_update_admin"
  on public.theory_questions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['admin', 'super_admin'])
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['admin', 'super_admin'])
    )
  );

create policy "theory_questions_delete_admin"
  on public.theory_questions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['admin', 'super_admin'])
    )
  );


commit;
