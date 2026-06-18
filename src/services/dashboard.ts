import { supabase } from "../lib/supabase";

export async function getDashboardStats() {
  try {
    const [
      profiles,
      courses,
      assignments,
      topics,
      questions,
      materials,
      exams,
      practice,
    ] = await Promise.all([
      supabase
  .from("profiles")
  .select("*", { count: "exact", head: true })
  .eq("role", "student"),
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase
        .from("course_assignments")
        .select("*", { count: "exact", head: true }),
      supabase.from("topics").select("*", { count: "exact", head: true }),
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase.from("materials").select("*", { count: "exact", head: true }),
      supabase
        .from("exam_attempts")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("practice_attempts")
        .select("*", { count: "exact", head: true }),
    ]);

    return {
      students: profiles.count || 0,
      courses: courses.count || 0,
      assignments: assignments.count || 0,
      topics: topics.count || 0,
      questions: questions.count || 0,
      materials: materials.count || 0,
      exams: exams.count || 0,
      practice: practice.count || 0,
    };
  } catch (error) {
    console.error(error);

    return {
      students: 0,
      courses: 0,
      assignments: 0,
      topics: 0,
      questions: 0,
      materials: 0,
      exams: 0,
      practice: 0,
    };
  }
}