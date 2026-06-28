import { supabase } from "../lib/supabase";

export type MaterialType = "pdf" | "video" | "note" | "image" | "link";

export type Material = {
  id: string;
  course_id: string;
  topic_id: string;
  title: string;
  type: MaterialType | string;
  file_url: string | null;
  content: string | null;
  uploaded_by: string | null;
  created_at: string;
  video_url: string | null;
  thumbnail_url: string | null;
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

export async function getMaterials(filters?: {
  course_ids?: string[];
  topic_ids?: string[];
}) {
  if (filters?.course_ids && filters.course_ids.length === 0) {
    return [] as Material[];
  }

  if (filters?.topic_ids && filters.topic_ids.length === 0) {
    return [] as Material[];
  }

  let query = supabase
    .from("materials")
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

  return data as Material[];
}

export async function createMaterial(payload: {
  course_id: string;
  topic_id: string;
  title: string;
  type: MaterialType;
  file_url: string;
  content: string;
  video_url: string;
  thumbnail_url: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("materials")
    .insert({
      course_id: payload.course_id,
      topic_id: payload.topic_id,
      title: payload.title.trim(),
      type: String(payload.type || "").toLowerCase() as MaterialType,
      file_url: payload.file_url.trim(),
      content: payload.content.trim(),
      video_url: payload.video_url.trim(),
      thumbnail_url: payload.thumbnail_url.trim(),
      uploaded_by: user?.id || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Material;
}

export async function updateMaterial(
  id: string,
  payload: {
    course_id: string;
    topic_id: string;
    title: string;
    type: MaterialType;
    file_url: string;
    content: string;
    video_url: string;
    thumbnail_url: string;
  }
) {
  const { data, error } = await supabase
    .from("materials")
    .update({
      course_id: payload.course_id,
      topic_id: payload.topic_id,
      title: payload.title.trim(),
      type: String(payload.type || "").toLowerCase() as MaterialType,
      file_url: payload.file_url.trim(),
      content: payload.content.trim(),
      video_url: payload.video_url.trim(),
      thumbnail_url: payload.thumbnail_url.trim(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Material;
}

export async function deleteMaterial(id: string) {
  const { error } = await supabase.from("materials").delete().eq("id", id);

  if (error) throw error;
}
