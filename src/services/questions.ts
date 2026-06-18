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
    code: string;
    title: string;
  };
  topics?: {
    title: string;
  };
};

export async function getQuestions() {
  const { data, error } = await supabase
    .from("questions")
    .select(`
      *,
      courses (
        code,
        title
      ),
      topics (
        title
      )
    `)
    .order("created_at", { ascending: false });

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
      ...payload,
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
      ...payload,
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

export async function bulkCreateQuestions(payload: {
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
}[]) {
  const rows = payload.map((item) => ({
    ...item,
    difficulty: "standard",
  }));

  const { data, error } = await supabase
    .from("questions")
    .insert(rows)
    .select();

  if (error) throw error;

  return data as Question[];
}