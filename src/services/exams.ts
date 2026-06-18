import { supabase } from "../lib/supabase";

export type ExamAttempt = {
  id: string;
  user_id: string;
  course_id: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  score_percent: number;
  time_used_seconds: number;
  submitted_by: string | null;
  created_at: string;
  student?: {
    username: string | null;
    email: string | null;
    department: string | null;
    level: string | null;
  };
  course?: {
    code: string;
    title: string;
  };
};

export type ExamAnswer = {
  id: string;
  attempt_id: string;
  user_id: string;
  question_id: string;
  selected_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
  is_flagged: boolean;
  created_at: string;
  question?: {
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    option_e: string | null;
    explanation: string | null;
  };
};

export async function getExamAttempts() {
  const { data: attempts, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const userIds = [...new Set((attempts || []).map((item) => item.user_id))];
  const courseIds = [...new Set((attempts || []).map((item) => item.course_id))];

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, email, department, level")
      .in(
        "id",
        userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]
      ),

    supabase
      .from("courses")
      .select("id, code, title")
      .in(
        "id",
        courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]
      ),
  ]);

  return (attempts || []).map((attempt) => ({
    ...attempt,
    student: profiles?.find((p) => p.id === attempt.user_id),
    course: courses?.find((c) => c.id === attempt.course_id),
  })) as ExamAttempt[];
}

export async function getExamAnswers(attemptId: string) {
  const { data, error } = await supabase
    .from("exam_answers")
    .select(`
      *,
      questions (
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        option_e,
        explanation
      )
    `)
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    question: item.questions,
  })) as ExamAnswer[];
}