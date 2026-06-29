import { supabase } from "../lib/supabase";

export type AcademicPeriodType = "semester" | "block";

export type AcademicPeriod = {
  id: string;
  school: string;
  faculty: string | null;
  department: string;
  level: string;
  period_type: AcademicPeriodType;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type AppPeriodControl = {
  id: string;
  school: string;
  faculty: string | null;
  department: string;
  level: string;
  live_period_id: string | null;
  workspace_period_id: string | null;
  updated_at: string;
};

export type Course = {
  id: string;
  code: string;
  title: string;
  semester: string | null;
  status: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  academic_period_id: string | null;
  course_icon?: string | null;
  course_color?: string | null;
  created_at: string;
  academic_periods?: AcademicPeriod | null;
  is_shared?: boolean;
  share_id?: string | null;
  source_school?: string | null;
  source_faculty?: string | null;
  source_department?: string | null;
  source_level?: string | null;
};

export type CourseShare = {
  id: string;
  course_id: string;
  school: string;
  faculty: string | null;
  department: string;
  level: string;
  academic_period_id: string | null;
  course_icon?: string | null;
  course_color?: string | null;
  created_at: string;
  academic_periods?: AcademicPeriod | null;
  is_shared?: boolean;
  share_id?: string | null;
  source_school?: string | null;
  source_faculty?: string | null;
  source_department?: string | null;
  source_level?: string | null;
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

function cleanValue(value?: string | null) {
  return String(value || "").trim();
}

function cleanNullable(value?: string | null) {
  const clean = cleanValue(value);
  return clean || null;
}

function normalizeDepartment(value?: string | null) {
  return cleanValue(value).toLowerCase();
}

export function getAcademicPeriodType(
  department?: string | null,
  level?: string | null
): AcademicPeriodType {
  const cleanDepartment = normalizeDepartment(department);
  const cleanLevel = cleanValue(level).toLowerCase();

  /*
    LASUCOM 100L should remain semester-based.
    Block system starts from 200L for Medicine/Dentistry.
  */
  if (cleanLevel === "100l") {
    return "semester";
  }

  if (
    cleanDepartment.includes("medicine") ||
    cleanDepartment.includes("surgery") ||
    cleanDepartment.includes("dentistry") ||
    cleanDepartment.includes("bds")
  ) {
    return "block";
  }

  return "semester";
}

export function getDefaultPeriodNames(
  department?: string | null,
  level?: string | null
) {
  const periodType = getAcademicPeriodType(department, level);

  if (periodType === "block") {
    return ["Block 1", "Block 2", "Block 3", "Block 4"];
  }

  return ["First Semester", "Second Semester"];
}

function cleanAcademicContext(payload: {
  school: string;
  faculty?: string | null;
  department: string;
  level: string;
}) {
  return {
    school: cleanValue(payload.school),
    faculty: cleanNullable(payload.faculty),
    department: cleanValue(payload.department),
    level: cleanValue(payload.level),
  };
}

export async function getAcademicPeriods(filters?: {
  school?: string;
  faculty?: string | null;
  department?: string;
  level?: string;
}) {
  let query = supabase
    .from("academic_periods")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (filters?.school) query = query.eq("school", cleanValue(filters.school));
  if (filters?.department) query = query.eq("department", cleanValue(filters.department));
  if (filters?.level) query = query.eq("level", cleanValue(filters.level));
  if (filters?.faculty) query = query.eq("faculty", cleanValue(filters.faculty));

  const { data, error } = await query;

  if (error) throw error;
  return data as AcademicPeriod[];
}

export async function ensureAcademicPeriods(payload: {
  school: string;
  faculty?: string | null;
  department: string;
  level: string;
}) {
  const context = cleanAcademicContext(payload);
  const existing = await getAcademicPeriods(context);

  if (existing.length > 0) return existing;

  const periodType = getAcademicPeriodType(context.department, context.level);
  const names = getDefaultPeriodNames(context.department, context.level);

  const rows = names.map((name, index) => ({
    ...context,
    period_type: periodType,
    name,
    sort_order: index + 1,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from("academic_periods")
    .insert(rows)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as AcademicPeriod[];
}

export async function getAppPeriodControl(filters: {
  school: string;
  faculty?: string | null;
  department: string;
  level: string;
}) {
  const context = cleanAcademicContext(filters);

  const { data, error } = await supabase
    .from("app_period_controls")
    .select("*")
    .eq("school", context.school)
    .eq("department", context.department)
    .eq("level", context.level)
    .maybeSingle();

  if (error) throw error;
  return data as AppPeriodControl | null;
}

export async function updateWorkspacePeriod(payload: {
  school: string;
  faculty?: string | null;
  department: string;
  level: string;
  workspace_period_id: string;
}) {
  const context = cleanAcademicContext(payload);

  const { data, error } = await supabase
    .from("app_period_controls")
    .upsert(
      {
        ...context,
        workspace_period_id: cleanValue(payload.workspace_period_id),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "school,department,level" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as AppPeriodControl;
}

export async function updateLiveAppPeriod(payload: {
  school: string;
  faculty?: string | null;
  department: string;
  level: string;
  live_period_id: string;
}) {
  const context = cleanAcademicContext(payload);

  const { data, error } = await supabase
    .from("app_period_controls")
    .upsert(
      {
        ...context,
        live_period_id: cleanValue(payload.live_period_id),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "school,department,level" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as AppPeriodControl;
}

export async function getCourses(filters?: {
  school?: string;
  faculty?: string | null;
  department?: string;
  level?: string;
  academic_period_id?: string;
}) {
  let ownedQuery = supabase
    .from("courses")
    .select(
      `
      *,
      academic_periods (*)
    `
    )
    .order("created_at", { ascending: false });

  if (filters?.school) ownedQuery = ownedQuery.eq("school", cleanValue(filters.school));
  if (filters?.department) ownedQuery = ownedQuery.eq("department", cleanValue(filters.department));
  if (filters?.level) ownedQuery = ownedQuery.eq("level", cleanValue(filters.level));
  if (filters?.academic_period_id) {
    ownedQuery = ownedQuery.eq("academic_period_id", cleanValue(filters.academic_period_id));
  }

  if (filters?.faculty) {
    ownedQuery = ownedQuery.eq("faculty", cleanValue(filters.faculty));
  }

  const { data: ownedData, error: ownedError } = await ownedQuery;

  if (ownedError) throw ownedError;

  /*
    Shared courses:
    A course may be created under one department, then shared with another department.
    When admin opens the receiving department workspace, shared courses should show there too.
  */
  let sharedData: any[] = [];

  if (filters?.school && filters?.department && filters?.level && filters?.academic_period_id) {
    let sharedQuery = supabase
      .from("course_shares")
      .select(
        `
        *,
        academic_periods (*),
        courses (
          *,
          academic_periods (*)
        )
      `
      )
      .eq("school", cleanValue(filters.school))
      .eq("department", cleanValue(filters.department))
      .eq("level", cleanValue(filters.level))
      .eq("academic_period_id", cleanValue(filters.academic_period_id))
      .order("created_at", { ascending: false });

    if (filters?.faculty) {
      sharedQuery = sharedQuery.eq("faculty", cleanValue(filters.faculty));
    }

    const { data, error } = await sharedQuery;

    if (error) throw error;
    sharedData = data || [];
  }

  const ownedCourses = ((ownedData || []) as Course[]).map((course) => ({
    ...course,
    is_shared: false,
    share_id: null,
    source_school: course.school,
    source_faculty: course.faculty,
    source_department: course.department,
    source_level: course.level,
  }));

  const sharedCourses = sharedData
    .map((share: any) => {
      const course = Array.isArray(share.courses) ? share.courses[0] : share.courses;

      if (!course) return null;

      return {
        ...course,
        school: share.school,
        faculty: share.faculty,
        department: share.department,
        level: share.level,
        academic_period_id: share.academic_period_id,
        academic_periods: share.academic_periods || course.academic_periods,
        semester: share.academic_periods?.name || course.semester,
        is_shared: true,
        share_id: share.id,
        source_school: course.school,
        source_faculty: course.faculty,
        source_department: course.department,
        source_level: course.level,
      } as Course;
    })
    .filter(Boolean) as Course[];

  const merged = [...ownedCourses, ...sharedCourses];

  return Array.from(
    new Map(
      merged.map((course) => [
        `${course.id}-${course.academic_period_id}-${course.department}-${course.level}-${course.is_shared ? "shared" : "owned"}`,
        course,
      ])
    ).values()
  ) as Course[];
}

export async function createCourse(payload: {
  code: string;
  title: string;
  semester?: string;
  status: string;
  school: string;
  faculty?: string | null;
  department: string;
  level: string;
  academic_period_id: string;
  course_icon?: string | null;
  course_color?: string | null;
}) {
  const periodId = cleanValue(payload.academic_period_id);

  const { data: period, error: periodError } = await supabase
    .from("academic_periods")
    .select("*")
    .eq("id", periodId)
    .maybeSingle();

  if (periodError) throw periodError;

  const { data, error } = await supabase
    .from("courses")
    .insert({
      code: cleanValue(payload.code).toUpperCase(),
      title: cleanValue(payload.title),
      semester: cleanValue(payload.semester || period?.name || ""),
      status: cleanValue(payload.status || "active"),
      school: cleanValue(payload.school),
      faculty: cleanNullable(payload.faculty),
      department: cleanValue(payload.department),
      level: cleanValue(payload.level),
      academic_period_id: periodId,
      course_icon: cleanValue(payload.course_icon || "book"),
      course_color: cleanValue(payload.course_color || "orange"),
    })
    .select("*, academic_periods (*)")
    .single();

  if (error) throw error;
  return data as Course;
}

export async function updateCourse(
  id: string,
  payload: {
    code: string;
    title: string;
    semester?: string;
    status: string;
    school?: string;
    faculty?: string | null;
    department?: string;
    level?: string;
    academic_period_id?: string | null;
    course_icon?: string | null;
    course_color?: string | null;
  }
) {
  const updatePayload: Record<string, any> = {
    code: cleanValue(payload.code).toUpperCase(),
    title: cleanValue(payload.title),
    semester: cleanValue(payload.semester || ""),
    status: cleanValue(payload.status),
  };

  if (payload.school !== undefined) updatePayload.school = cleanValue(payload.school);
  if (payload.faculty !== undefined) updatePayload.faculty = cleanNullable(payload.faculty);
  if (payload.department !== undefined) updatePayload.department = cleanValue(payload.department);
  if (payload.level !== undefined) updatePayload.level = cleanValue(payload.level);
  if (payload.academic_period_id !== undefined) {
    updatePayload.academic_period_id = cleanNullable(payload.academic_period_id);
  }
  if (payload.course_icon !== undefined) updatePayload.course_icon = cleanValue(payload.course_icon || "book");
  if (payload.course_color !== undefined) updatePayload.course_color = cleanValue(payload.course_color || "orange");

  const { data, error } = await supabase
    .from("courses")
    .update(updatePayload)
    .eq("id", id)
    .select("*, academic_periods (*)")
    .single();

  if (error) throw error;
  return data as Course;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

export async function getCourseShares(courseId: string) {
  const { data, error } = await supabase
    .from("course_shares")
    .select("*, academic_periods (*)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as CourseShare[];
}

export async function shareCourseWithDepartment(payload: {
  course_id: string;
  school: string;
  faculty?: string | null;
  department: string;
  level: string;
  academic_period_id: string;
}) {
  const clean = {
    course_id: cleanValue(payload.course_id),
    school: cleanValue(payload.school),
    faculty: cleanNullable(payload.faculty),
    department: cleanValue(payload.department),
    level: cleanValue(payload.level),
    academic_period_id: cleanValue(payload.academic_period_id),
  };

  const { data: existing, error: existingError } = await supabase
    .from("course_shares")
    .select("*")
    .eq("course_id", clean.course_id)
    .eq("school", clean.school)
    .eq("department", clean.department)
    .eq("level", clean.level)
    .eq("academic_period_id", clean.academic_period_id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as CourseShare;

  const { data, error } = await supabase
    .from("course_shares")
    .insert(clean)
    .select("*, academic_periods (*)")
    .single();

  if (error) throw error;
  return data as CourseShare;
}

export async function deleteCourseShare(id: string) {
  const { error } = await supabase.from("course_shares").delete().eq("id", id);
  if (error) throw error;
}

/*
  Backward compatibility:
  Keep these functions so old pages do not break immediately.
  We will gradually migrate the UI from assignment to share with another department.
*/

function cleanAssignmentPayload(payload: {
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
  const clean = cleanAssignmentPayload(payload);

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
