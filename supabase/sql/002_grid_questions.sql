-- ============================================================================
-- 002_grid_questions.sql
--
-- Fill-in-the-blank table ("grid") questions. An admin builds a table, types
-- the correct content into every cell, and marks some cells as blank; students
-- see the same table with those cells empty and type the missing values.
--
-- Run this in the Supabase SQL editor (this project is not migration-managed:
-- there is no supabase/migrations history, so `supabase db push` is not used).
-- The whole script is idempotent and safe to re-run.
--
-- Companion to public.questions (MCQ) and public.theory_questions (free text).
-- Kept separate for the same reason those two are separate: the shapes really
-- differ. A grid question has no question_html/answer_html; its answers ARE the
-- blanked cells. Mixing them would break the Theory tab exactly the way
-- optionless rows would break the MCQ tab.
--
-- ---------------------------------------------------------------------------
-- GRID SHAPE (the `grid` jsonb column)
-- ---------------------------------------------------------------------------
--   {
--     "version": 1,
--     "columns": [ { "id": "c1", "header": "Enzyme" }, ... ],
--     "rows":    [ { "id": "r1", "cells": [ { "content": "Hexokinase",
--                                            "blank": false }, ... ] }, ... ]
--   }
--
-- Stable row/column ids (not array indices) give React real keys and give a
-- future answers table a durable address per blank ("r1:c2") that survives the
-- admin inserting or deleting rows.
--
-- Cells are PLAIN TEXT in v1. The upgrade path for maths is a single shared
-- equation modal writing "$...$" into the focused cell -- EquationBuilder has
-- no TipTap dependency, so that needs no refactor and, because cells live in
-- jsonb, no migration.
--
-- ---------------------------------------------------------------------------
-- GRADING
-- ---------------------------------------------------------------------------
-- These questions ARE auto-graded and carry XP, like MCQs -- unlike
-- theory_questions, which are self-check because essays cannot be graded.
--
-- A submitted answer matches the stored cell content when, on BOTH sides:
--     trim -> collapse internal whitespace to one space -> case-fold
-- and the results are equal. Deliberately NOT fuzzy/Levenshtein matching:
-- in a medical and pharmacology context "hypoglycaemia" and "hyperglycaemia"
-- are two edits apart, and accepting near-misses would be actively harmful.
--
-- The canonical implementation of that rule lives in TypeScript and is shared
-- with the student app; it is described here in prose so the two cannot drift
-- silently. No grading logic is implemented in SQL.
--
-- Per-blank alternate answers ("accept": ["G6P", "glucose-6-phosphate"]) are
-- the intended v2 and fit inside the existing cell object with no migration.
--
-- Attempt/answer tables are NOT created here. Their shape depends on how the
-- student app submits, and this repo is admin-only -- guessing now would leave
-- a table nobody writes to. See the note at the bottom of this file.
--
-- SECURITY: writes are gated on the admin role check used by app_reviews and
-- notifications. This intentionally does NOT mirror public.questions, whose
-- write policies carry no role check at all.
-- ============================================================================


-- Wrapped in a transaction: Postgres DDL is transactional, so a failure
-- part-way through rolls the whole thing back rather than leaving a
-- half-created table behind.
begin;


-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.grid_questions (
  id          uuid primary key default gen_random_uuid(),

  -- Both ids are stored even though topic implies course, matching
  -- public.questions and public.theory_questions; the service layer filters
  -- on course_ids/topic_ids.
  course_id   uuid not null references public.courses(id) on delete cascade,
  topic_id    uuid not null references public.topics(id)  on delete cascade,

  -- Optional instruction shown above the table ("Complete the table below.").
  prompt_html text,
  prompt_text text not null default '',

  grid        jsonb not null,

  -- Derived from `grid` by the trigger below, never trusted from the client.
  -- Denormalized so the list view can show "3x2 table, 3 blanks" without
  -- parsing JSON -- same reasoning as theory_questions.question_text.
  row_count   integer not null default 0,
  col_count   integer not null default 0,
  blank_count integer not null default 0,

  marks       integer,
  difficulty  text    not null default 'standard',
  position    integer not null default 0,

  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- coalesce is load-bearing: a CHECK whose expression evaluates to NULL
  -- PASSES, so a grid missing "columns" entirely would slip through
  -- `jsonb_typeof(grid -> 'columns') = 'array'` without it.
  constraint grid_questions_grid_shape check (
    jsonb_typeof(grid) = 'object'
    and coalesce(jsonb_typeof(grid -> 'columns'), '') = 'array'
    and coalesce(jsonb_typeof(grid -> 'rows'), '') = 'array'
  ),

  constraint grid_questions_marks_non_negative
    check (marks is null or marks >= 0)
);

comment on table  public.grid_questions             is 'Fill-in-the-blank table questions. Auto-graded with XP, like MCQs.';
comment on column public.grid_questions.grid        is 'Grid as {version, columns:[{id,header}], rows:[{id,cells:[{content,blank}]}]}. Cells are plain text in v1.';
comment on column public.grid_questions.prompt_html is 'Optional instruction above the table. Sanitize before rendering.';
comment on column public.grid_questions.blank_count is 'Derived from grid by trigger; do not set from the client.';
comment on column public.grid_questions.position    is 'Manual ordering within a topic; ties broken by created_at.';


-- ---------------------------------------------------------------------------
-- 2. Indexes
--
-- No GIN index on `grid`: nothing queries inside the JSON. The grid is always
-- fetched and saved whole, and the list view reads the derived counters.
-- ---------------------------------------------------------------------------
create index if not exists grid_questions_topic_idx
  on public.grid_questions (topic_id);

create index if not exists grid_questions_course_idx
  on public.grid_questions (course_id);

create index if not exists grid_questions_topic_position_idx
  on public.grid_questions (topic_id, position, created_at desc);


-- ---------------------------------------------------------------------------
-- 3. updated_at + derived counters
--
-- Deriving the counters here rather than in the service means they cannot
-- drift: a client that forgets to send them, or sends wrong ones, still ends
-- up with correct values. Scoped to this feature so it cannot clobber a
-- shared trigger function.
-- ---------------------------------------------------------------------------
create or replace function public.grid_questions_sync()
returns trigger
language plpgsql
as $$
declare
  v_rows   jsonb   := coalesce(new.grid -> 'rows', '[]'::jsonb);
  v_cols   jsonb   := coalesce(new.grid -> 'columns', '[]'::jsonb);
  v_blanks integer := 0;
begin
  new.updated_at := now();

  -- BEFORE triggers run ahead of CHECK constraints, so this can still see a
  -- malformed grid; guard rather than let jsonb_array_length raise.
  if jsonb_typeof(v_rows) = 'array' then
    new.row_count := jsonb_array_length(v_rows);
  else
    new.row_count := 0;
    v_rows := '[]'::jsonb;
  end if;

  if jsonb_typeof(v_cols) = 'array' then
    new.col_count := jsonb_array_length(v_cols);
  else
    new.col_count := 0;
  end if;

  select count(*)::integer
    into v_blanks
  from jsonb_array_elements(v_rows) as row_elem(row_json)
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(row_elem.row_json -> 'cells') = 'array'
        then row_elem.row_json -> 'cells'
      else '[]'::jsonb
    end
  ) as cell_elem(cell_json)
  -- Compared as text, not cast to boolean: a stray non-boolean value counts
  -- as "not blank" instead of raising on an invalid cast.
  where coalesce(cell_elem.cell_json ->> 'blank', 'false') = 'true';

  new.blank_count := coalesce(v_blanks, 0);

  return new;
end;
$$;

drop trigger if exists grid_questions_sync on public.grid_questions;

create trigger grid_questions_sync
  before insert or update on public.grid_questions
  for each row
  execute function public.grid_questions_sync();


-- ---------------------------------------------------------------------------
-- 4. Grants
--
-- Authenticated only. The explicit revoke matters: Supabase's default schema
-- privileges hand `anon` table-level SELECT on new public tables, so granting
-- to `authenticated` alone does not take it away. (001 relied on this being
-- run by hand; here it is part of the script.)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.grid_questions to authenticated;
revoke select, insert, update, delete on public.grid_questions from anon;


-- ---------------------------------------------------------------------------
-- 5. Row Level Security
--
-- SELECT : any authenticated user (the student app will read these).
-- WRITE  : admin / super_admin only, using the same EXISTS check as
--          app_reviews and notifications.
-- ---------------------------------------------------------------------------
alter table public.grid_questions enable row level security;

drop policy if exists "grid_questions_select_authenticated" on public.grid_questions;
drop policy if exists "grid_questions_insert_admin"         on public.grid_questions;
drop policy if exists "grid_questions_update_admin"         on public.grid_questions;
drop policy if exists "grid_questions_delete_admin"         on public.grid_questions;

create policy "grid_questions_select_authenticated"
  on public.grid_questions
  for select
  to authenticated
  using (true);

create policy "grid_questions_insert_admin"
  on public.grid_questions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['admin', 'super_admin'])
    )
  );

create policy "grid_questions_update_admin"
  on public.grid_questions
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

create policy "grid_questions_delete_admin"
  on public.grid_questions
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


-- ============================================================================
-- NOT IN THIS MIGRATION -- grid question attempts
--
-- Grading is confirmed (auto-graded, XP-bearing), but the attempt/answer
-- tables belong with the student-app work, because their shape depends on how
-- that app submits. For reference, the MCQ precedent this would follow is:
--
--   exam_attempts(total_questions, correct_answers, wrong_answers,
--                 unanswered, score_percent, time_used_seconds, xp_earned)
--   exam_answers (attempt_id, question_id, selected_answer, correct_answer,
--                 is_correct, is_flagged)
--
-- The grid equivalent needs one row per BLANK rather than per question, keyed
-- by the stable cell address ("r1:c2"), plus the submitted and expected text
-- and an is_correct flag computed by the shared matching rule described above.
--
-- Everything required to grade is already stored by this migration: the
-- correct content of every cell, which cells are blank, and the marks.
-- ============================================================================
