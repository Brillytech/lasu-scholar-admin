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
    code: string;
    title: string;
  };
};

export async function getTopics() {
  const { data, error } = await supabase
    .from("topics")
    .select(`
      *,
      courses (
        code,
        title
      )
    `)
    .order("created_at", { ascending: false });

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
    .insert(payload)
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
    .update(payload)
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