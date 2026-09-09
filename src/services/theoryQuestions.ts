import { supabase } from "../lib/supabase";

/*
  Free-response ("theory") questions.

  Companion to ./questions.ts (MCQ). Same topic/course linkage and the same
  embedded relation shape, so the Questions page can reuse its existing
  courseById / filter logic for both tabs.

  Content contract: `question_html` is TipTap HTML with math embedded as
  <span data-type="inline-math" data-latex="...">, and `question_text` is the
  plain-text mirror used for list previews and client-side search. Callers are
  expected to supply both (TipTap gives them via getHTML() / getText()) --
  nothing here strips tags.
*/

export type TheoryQuestion = {
  id: string;
  course_id: string;
  topic_id: string;
  question_html: string;
  question_text: string;
  answer_html: string | null;
  answer_text: string | null;
  marks: number | null;
  difficulty: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  courses?: {
    id?: string;
    code: string;
    title: string;
    school?: string | null;
    faculty?: string | null;
    department?: string | null;
    level?: string | null;
    semester?: string | null;
    academic_period_id?: string | null;
    academic_periods?: {
      id: string;
      name: string;
      period_type: "semester" | "block";
    } | null;
  };
  topics?: {
    id?: string;
    title: string;
  };
};

export type TheoryQuestionPayload = {
  course_id: string;
  topic_id: string;
  question_html: string;
  question_text: string;
  answer_html?: string | null;
  answer_text?: string | null;
  marks?: number | string | null;
  position?: number;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

/*
  `marks` is an integer column but the form field hands us a string, and an
  empty one must become NULL rather than "" (which Postgres rejects).
*/
function toMarks(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.trunc(parsed);
}

function toRow(payload: TheoryQuestionPayload) {
  return {
    course_id: payload.course_id,
    topic_id: payload.topic_id,
    question_html: clean(payload.question_html),
    question_text: clean(payload.question_text),
    answer_html: clean(payload.answer_html),
    answer_text: clean(payload.answer_text),
    marks: toMarks(payload.marks),
    position: payload.position ?? 0,
  };
}

export async function getTheoryQuestions(filters?: {
  course_ids?: string[];
  topic_ids?: string[];
}) {
  if (filters?.course_ids && filters.course_ids.length === 0) {
    return [] as TheoryQuestion[];
  }

  if (filters?.topic_ids && filters.topic_ids.length === 0) {
    return [] as TheoryQuestion[];
  }

  let query = supabase
    .from("theory_questions")
    .select(
      `
      *,
      courses (
        id,
        code,
        title,
        school,
        faculty,
        department,
        level,
        semester,
        academic_period_id,
        academic_periods (
          id,
          name,
          period_type
        )
      ),
      topics (
        id,
        title
      )
    `
    )
    /*
      Matches the (topic_id, position, created_at desc) index. Every row starts
      at position 0, so today this behaves exactly like the MCQ list's
      created_at desc -- it just leaves room for manual ordering later.
    */
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.course_ids && filters.course_ids.length > 0) {
    query = query.in("course_id", filters.course_ids);
  }

  if (filters?.topic_ids && filters.topic_ids.length > 0) {
    query = query.in("topic_id", filters.topic_ids);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data as TheoryQuestion[];
}

export async function createTheoryQuestion(
  payload: TheoryQuestionPayload & { created_by?: string | null }
) {
  const { data, error } = await supabase
    .from("theory_questions")
    .insert({
      ...toRow(payload),
      created_by: payload.created_by || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data as TheoryQuestion;
}

/*
  `created_by` is deliberately not updatable -- it records who authored the
  question. `updated_at` is maintained by the theory_questions_set_updated_at
  trigger, so it is never sent from here.
*/
export async function updateTheoryQuestion(
  id: string,
  payload: TheoryQuestionPayload
) {
  const { data, error } = await supabase
    .from("theory_questions")
    .update(toRow(payload))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as TheoryQuestion;
}

export async function deleteTheoryQuestion(id: string) {
  const { error } = await supabase
    .from("theory_questions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
