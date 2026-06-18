import { supabase } from "../lib/supabase";

export type Course = {
  id: string;
  code: string;
  title: string;
  semester: string | null;
  status: string | null;
  created_at: string;
};

export type CourseAssignment = {
  id: string;
  course_id: string;
  school: string;
  faculty: string;
  department: string;
  level: string;
  created_at: string;
};

export async function getCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Course[];
}

export async function createCourse(payload: {
  code: string;
  title: string;
  semester: string;
  status: string;
}) {
  const { data, error } = await supabase
    .from("courses")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Course;
}

export async function updateCourse(
  id: string,
  payload: {
    code: string;
    title: string;
    semester: string;
    status: string;
  }
) {
  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Course;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) throw error;
}

export async function getCourseAssignments(courseId: string) {
  const { data, error } = await supabase
    .from("course_assignments")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as CourseAssignment[];
}

export async function createCourseAssignment(payload: {
  course_id: string;
  school: string;
  faculty: string;
  department: string;
  level: string;
}) {
  const { data, error } = await supabase
    .from("course_assignments")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as CourseAssignment;
}

export async function deleteCourseAssignment(id: string) {
  const { error } = await supabase
    .from("course_assignments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}