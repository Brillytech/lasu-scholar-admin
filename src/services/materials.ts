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
    code: string;
    title: string;
  };
  topics?: {
    title: string;
  };
};

export async function getMaterials() {
  const { data, error } = await supabase
    .from("materials")
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
      ...payload,
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
    .update(payload)
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