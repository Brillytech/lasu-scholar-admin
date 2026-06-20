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

export type CourseWithAssignments = Course & {
  course_assignments?: CourseAssignment[];
};

function cleanText(value: string) {
  return value.trim();
}

function cleanCourseCode(value: string) {
  return value.trim().toUpperCase();
}

function cleanPayload<T extends Record<string, any>>(payload: T): T {
  const cleaned: Record<string, any> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === "string") {
      cleaned[key] = value.trim();
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned as T;
}

export async function getCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as Course[];
}

export async function getCoursesWithAssignments() {
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      course_assignments (*)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as CourseWithAssignments[];
}

export async function createCourse(payload: {
  code: string;
  title: string;
  semester: string;
  status: string;
}) {
  const cleanedPayload = {
    code: cleanCourseCode(payload.code),
    title: cleanText(payload.title),
    semester: cleanText(payload.semester),
    status: cleanText(payload.status),
  };

  const { data, error } = await supabase
    .from("courses")
    .insert(cleanedPayload)
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
  const cleanedPayload = {
    code: cleanCourseCode(payload.code),
    title: cleanText(payload.title),
    semester: cleanText(payload.semester),
    status: cleanText(payload.status),
  };

  const { data, error } = await supabase
    .from("courses")
    .update(cleanedPayload)
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

  return (data || []) as CourseAssignment[];
}

export async function createCourseAssignment(payload: {
  course_id: string;
  school: string;
  faculty: string;
  department: string;
  level: string;
}) {
  const cleanedPayload = cleanPayload({
    course_id: payload.course_id,
    school: payload.school,
    faculty: payload.faculty,
    department: payload.department,
    level: payload.level,
  });

  const { data: existingAssignment, error: checkError } = await supabase
    .from("course_assignments")
    .select("*")
    .eq("course_id", cleanedPayload.course_id)
    .ilike("school", cleanedPayload.school)
    .ilike("faculty", cleanedPayload.faculty)
    .ilike("department", cleanedPayload.department)
    .ilike("level", cleanedPayload.level)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existingAssignment) {
    return existingAssignment as CourseAssignment;
  }

  const { data, error } = await supabase
    .from("course_assignments")
    .insert(cleanedPayload)
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

export async function getAssignedCoursesForStudent(payload: {
  school: string;
  faculty: string;
  department: string;
  level: string;
}) {
  const cleanedPayload = cleanPayload({
    school: payload.school,
    faculty: payload.faculty,
    department: payload.department,
    level: payload.level,
  });

  const { data, error } = await supabase
    .from("course_assignments")
    .select(
      `
      *,
      courses (*)
    `
    )
    .ilike("school", cleanedPayload.school)
    .ilike("faculty", cleanedPayload.faculty)
    .ilike("department", cleanedPayload.department)
    .ilike("level", cleanedPayload.level)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const courses =
    data
      ?.map((assignment: any) => assignment.courses)
      .filter(Boolean) || [];

  return courses as Course[];
}