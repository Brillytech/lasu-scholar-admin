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

function cleanValue(value: string) {
  return String(value || "").trim();
}

function cleanPayload(payload: {
  course_id: string;
  school: string;
  faculty: string;
  department: string;
  level: string;
}) {
  return {
    course_id: cleanValue(payload.course_id),
    school: cleanValue(payload.school),
    faculty: cleanValue(payload.faculty),
    department: cleanValue(payload.department),
    level: cleanValue(payload.level),
  };
}

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
    .insert({
      code: cleanValue(payload.code).toUpperCase(),
      title: cleanValue(payload.title),
      semester: cleanValue(payload.semester),
      status: cleanValue(payload.status),
    })
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
    .update({
      code: cleanValue(payload.code).toUpperCase(),
      title: cleanValue(payload.title),
      semester: cleanValue(payload.semester),
      status: cleanValue(payload.status),
    })
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
  const clean = cleanPayload(payload);

  const { data: existing, error: existingError } = await supabase
    .from("course_assignments")
    .select("*")
    .eq("course_id", clean.course_id)
    .eq("school", clean.school)
    .eq("faculty", clean.faculty)
    .eq("department", clean.department)
    .eq("level", clean.level)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as CourseAssignment;

  const { data, error } = await supabase
    .from("course_assignments")
    .insert(clean)
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
