import { supabase } from "../lib/supabase";

export type Topic = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  summary_1: string | null;
  summary_2: string | null;
  summary_3: string | null;
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
};

export async function getTopics(filters?: { course_ids?: string[] }) {
  if (filters?.course_ids && filters.course_ids.length === 0) {
    return [] as Topic[];
  }

  let query = supabase
    .from("topics")
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
      )
    `
    )
    .order("created_at", { ascending: false });

  if (filters?.course_ids && filters.course_ids.length > 0) {
    query = query.in("course_id", filters.course_ids);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data as Topic[];
}

export async function createTopic(payload: {
  course_id: string;
  title: string;
  description: string;
  summary_1: string;
  summary_2: string;
  summary_3: string;
}) {
  const { data, error } = await supabase
    .from("topics")
    .insert({
      course_id: payload.course_id,
      title: payload.title.trim(),
      description: payload.description.trim(),
      summary_1: payload.summary_1.trim(),
      summary_2: payload.summary_2.trim(),
      summary_3: payload.summary_3.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  return data as Topic;
}

export async function updateTopic(
  id: string,
  payload: {
    course_id: string;
    title: string;
    description: string;
    summary_1: string;
    summary_2: string;
    summary_3: string;
  }
) {
  const { data, error } = await supabase
    .from("topics")
    .update({
      course_id: payload.course_id,
      title: payload.title.trim(),
      description: payload.description.trim(),
      summary_1: payload.summary_1.trim(),
      summary_2: payload.summary_2.trim(),
      summary_3: payload.summary_3.trim(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Topic;
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) throw error;
}
