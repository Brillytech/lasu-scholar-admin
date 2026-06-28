import { supabase } from "../lib/supabase";

export type DashboardStats = {
  students: number;
  courses: number;
  topics: number;
  questions: number;
  materials: number;
  exams: number;
  practice: number;
  assignments: number;
  sharedCourses: number;
  academicPeriods: number;
  periodControls: number;
};

export type AcademicControlOverview = {
  id: string;
  school: string;
  faculty: string | null;
  department: string;
  level: string;
  live_period_id: string | null;
  workspace_period_id: string | null;
  updated_at: string;
  live_period?: {
    id: string;
    name: string;
    period_type: "semester" | "block";
  } | null;
  workspace_period?: {
    id: string;
    name: string;
    period_type: "semester" | "block";
  } | null;
};

export async function getDashboardStats() {
  try {
    const [
      profiles,
      courses,
      assignments,
      shares,
      periods,
      controls,
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

      supabase
        .from("course_shares")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("academic_periods")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("app_period_controls")
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
      assignments: (assignments.count || 0) + (shares.count || 0),
      sharedCourses: shares.count || 0,
      academicPeriods: periods.count || 0,
      periodControls: controls.count || 0,
      topics: topics.count || 0,
      questions: questions.count || 0,
      materials: materials.count || 0,
      exams: exams.count || 0,
      practice: practice.count || 0,
    } as DashboardStats;
  } catch (error) {
    console.error(error);

    return {
      students: 0,
      courses: 0,
      assignments: 0,
      sharedCourses: 0,
      academicPeriods: 0,
      periodControls: 0,
      topics: 0,
      questions: 0,
      materials: 0,
      exams: 0,
      practice: 0,
    } as DashboardStats;
  }
}

export async function getAcademicControlOverview(limit = 8) {
  const { data: controls, error } = await supabase
    .from("app_period_controls")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const periodIds = Array.from(
    new Set(
      (controls || [])
        .flatMap((item) => [item.live_period_id, item.workspace_period_id])
        .filter(Boolean)
    )
  );

  const { data: periods, error: periodsError } = await supabase
    .from("academic_periods")
    .select("id, name, period_type")
    .in(
      "id",
      periodIds.length ? periodIds : ["00000000-0000-0000-0000-000000000000"]
    );

  if (periodsError) throw periodsError;

  return (controls || []).map((control) => ({
    ...control,
    live_period:
      periods?.find((period) => period.id === control.live_period_id) || null,
    workspace_period:
      periods?.find((period) => period.id === control.workspace_period_id) || null,
  })) as AcademicControlOverview[];
}
