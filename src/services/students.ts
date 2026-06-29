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

export async function promoteLasucom100LevelDepartment(department: string) {
  const targetDepartment = department.trim();

  if (!targetDepartment) {
    throw new Error("Department is required.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      level: "200L",
      school: "LASUCOM",
      faculty: "College of Medicine",
    })
    .eq("school", "LASUCOM")
    .eq("department", targetDepartment)
    .in("level", ["100L", "100 Level"])
    .eq("role", "student")
    .select("*");

  if (error) throw error;

  return data as Student[];
}
