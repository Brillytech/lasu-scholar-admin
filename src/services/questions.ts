import { supabase } from "../lib/supabase";

export type Question = {
  id: string;
  course_id: string;
  topic_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string | null;
  correct_answer: string;
  explanation: string | null;
  difficulty: string | null;
  created_at: string;
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

function clean(value?: string | null) {
  return String(value || "").trim();
}

export async function getQuestions(filters?: {
  course_ids?: string[];
  topic_ids?: string[];
}) {
  if (filters?.course_ids && filters.course_ids.length === 0) {
    return [] as Question[];
  }

  if (filters?.topic_ids && filters.topic_ids.length === 0) {
    return [] as Question[];
  }

  let query = supabase
    .from("questions")
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
    .order("created_at", { ascending: false });

  if (filters?.course_ids && filters.course_ids.length > 0) {
    query = query.in("course_id", filters.course_ids);
  }

  if (filters?.topic_ids && filters.topic_ids.length > 0) {
    query = query.in("topic_id", filters.topic_ids);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data as Question[];
}

export async function createQuestion(payload: {
  course_id: string;
  topic_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
}) {
  const { data, error } = await supabase
    .from("questions")
    .insert({
      course_id: payload.course_id,
      topic_id: payload.topic_id,
      question: clean(payload.question),
      option_a: clean(payload.option_a),
      option_b: clean(payload.option_b),
      option_c: clean(payload.option_c),
      option_d: clean(payload.option_d),
      option_e: clean(payload.option_e),
      correct_answer: clean(payload.correct_answer).toUpperCase(),
      explanation: clean(payload.explanation),
      difficulty: "standard",
    })
    .select()
    .single();

  if (error) throw error;

  return data as Question;
}

export async function updateQuestion(
  id: string,
  payload: {
    course_id: string;
    topic_id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    option_e: string;
    correct_answer: string;
    explanation: string;
  }
) {
  const { data, error } = await supabase
    .from("questions")
    .update({
      course_id: payload.course_id,
      topic_id: payload.topic_id,
      question: clean(payload.question),
      option_a: clean(payload.option_a),
      option_b: clean(payload.option_b),
      option_c: clean(payload.option_c),
      option_d: clean(payload.option_d),
      option_e: clean(payload.option_e),
      correct_answer: clean(payload.correct_answer).toUpperCase(),
      explanation: clean(payload.explanation),
      difficulty: "standard",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Question;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase.from("questions").delete().eq("id", id);

  if (error) throw error;
}

export async function bulkCreateQuestions(
  payload: {
    course_id: string;
    topic_id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    option_e: string;
    correct_answer: string;
    explanation: string;
  }[]
) {
  const rows = payload.map((item) => ({
    course_id: item.course_id,
    topic_id: item.topic_id,
    question: clean(item.question),
    option_a: clean(item.option_a),
    option_b: clean(item.option_b),
    option_c: clean(item.option_c),
    option_d: clean(item.option_d),
    option_e: clean(item.option_e),
    correct_answer: clean(item.correct_answer).toUpperCase(),
    explanation: clean(item.explanation),
    difficulty: "standard",
  }));

  const { data, error } = await supabase
    .from("questions")
    .insert(rows)
    .select();

  if (error) throw error;

  return data as Question[];
}
