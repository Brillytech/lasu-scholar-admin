import { supabase } from "../lib/supabase";

export async function getAnalyticsData() {
  const [
    profiles,
    courses,
    topics,
    questions,
    materials,
    practiceAttempts,
    examAttempts,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("courses").select("*"),
    supabase.from("topics").select("*, courses(code, title)"),
    supabase.from("questions").select("*, courses(code, title), topics(title)"),
    supabase.from("materials").select("*, courses(code, title), topics(title)"),
    supabase.from("practice_attempts").select("*, courses(code, title)"),
    supabase.from("exam_attempts").select("*, courses(code, title)"),
  ]);

  if (profiles.error) throw profiles.error;
  if (courses.error) throw courses.error;
  if (topics.error) throw topics.error;
  if (questions.error) throw questions.error;
  if (materials.error) throw materials.error;
  if (practiceAttempts.error) throw practiceAttempts.error;
  if (examAttempts.error) throw examAttempts.error;

  return {
    profiles: profiles.data || [],
    courses: courses.data || [],
    topics: topics.data || [],
    questions: questions.data || [],
    materials: materials.data || [],
    practiceAttempts: practiceAttempts.data || [],
    examAttempts: examAttempts.data || [],
  };
}