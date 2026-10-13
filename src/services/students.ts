import { supabase } from "../lib/supabase";

export type Student = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  profile_completed: boolean | null;
  created_at: string;
};

export type StudentAcademicDetails = {
  school: string;
  faculty: string;
  department: string;
  level: string;
};

/* Thrown when the update was accepted but the stored row disagrees with it. */
export class AcademicUpdateMismatchError extends Error {
  mismatches: { field: keyof StudentAcademicDetails; sent: string; stored: string }[];

  constructor(mismatches: AcademicUpdateMismatchError["mismatches"]) {
    super("The saved values did not match what was sent.");
    this.name = "AcademicUpdateMismatchError";
    this.mismatches = mismatches;
  }
}

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

/*
  Corrects a student's locked academic details.

  Writes directly to profiles the way promoteLasucom100LevelDepartment does,
  rather than through the student app's limited RPC, which exists to apply
  student-side restrictions. Only these four fields are ever sent — role and
  email are not part of the payload.

  Supabase reports success for an update that RLS or a trigger silently
  narrowed, so the row is read back and compared field by field. A value that
  did not stick throws AcademicUpdateMismatchError instead of reporting
  success, because the admin needs to know the correction did not take.
*/
export async function updateStudentAcademicDetails(
  studentId: string,
  details: StudentAcademicDetails
) {
  const payload = {
    school: details.school.trim(),
    faculty: details.faculty.trim(),
    department: details.department.trim(),
    level: details.level.trim(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", studentId);

  if (error) throw error;

  const { data: stored, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .single();

  if (readError) throw readError;

  const fields = Object.keys(payload) as (keyof StudentAcademicDetails)[];
  const mismatches = fields
    .map((field) => ({
      field,
      sent: payload[field],
      stored: String((stored as Student)[field] || ""),
    }))
    .filter((item) => item.sent !== item.stored);

  if (mismatches.length > 0) {
    throw new AcademicUpdateMismatchError(mismatches);
  }

  return stored as Student;
}
