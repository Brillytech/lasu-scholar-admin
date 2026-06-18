import { supabase } from "../lib/supabase";

export type Student = {
  id: string;
  username: string | null;
  email: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  profile_completed: boolean | null;
  created_at: string;
};

export async function getStudents() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as Student[];
}