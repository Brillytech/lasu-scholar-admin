import { getLevelOptions, normalizeLevel } from "../lib/levels";
import { LASUCOM_FACULTY } from "../lib/academics";
import type { StudentAcademicDetails } from "../services/students";

/*
  Decision logic for EditAcademicModal, kept out of the component so each
  state can be exercised directly -- same split as theoryQuestionForm.ts and
  gridQuestionForm.ts.
*/

export const MIN_REASON = 10;

export type AcademicFormState = StudentAcademicDetails & { reason: string };

export type DiffKind = "changed" | "normalised" | "unchanged";

export type DiffRow = {
  field: keyof StudentAcademicDetails;
  label: string;
  before: string;
  after: string;
  kind: DiffKind;
};

/* What the diff is built against: just the stored academic columns. */
export type StoredAcademics = {
  school?: string | null;
  faculty?: string | null;
  department?: string | null;
  level?: string | null;
};

export const ACADEMIC_FIELDS: {
  field: keyof StudentAcademicDetails;
  label: string;
}[] = [
  { field: "school", label: "School" },
  { field: "faculty", label: "Faculty" },
  { field: "department", label: "Department" },
  { field: "level", label: "Level" },
];

/* The form opens on the stored values, with a legacy level already repaired. */
export function formFromStudent(stored: StoredAcademics): AcademicFormState {
  return {
    school: stored.school || "",
    faculty: stored.faculty || "",
    department: stored.department || "",
    level: normalizeLevel(stored.level),
    reason: "",
  };
}

export function buildDiff(
  stored: StoredAcademics,
  form: AcademicFormState
): DiffRow[] {
  return ACADEMIC_FIELDS.map(({ field, label }) => {
    const was = String(stored[field] || "");
    const next = form[field];

    /*
      Level is compared normalised, so "100 Level" -> "100L" reads as a repair
      of the stored spelling rather than a move to a different level.
    */
    const comparable = field === "level" ? normalizeLevel(was) : was;

    let kind: DiffKind = "unchanged";
    if (comparable !== next) kind = "changed";
    else if (was !== next) kind = "normalised";

    return { field, label, before: was || "Not set", after: next || "Not set", kind };
  });
}

export function hasAnyChange(diff: DiffRow[]) {
  return diff.some((row) => row.kind !== "unchanged");
}

/* A real edit to Level or Department moves the student between cohorts. */
export function movesCohort(diff: DiffRow[]) {
  return diff.some(
    (row) =>
      row.kind === "changed" && (row.field === "level" || row.field === "department")
  );
}

/*
  Normalising a legacy level is not a cohort move: the stored spelling matched
  no course at all, so this only repairs the value.
*/
export function repairsOnly(diff: DiffRow[]) {
  return !movesCohort(diff) && diff.some((row) => row.kind === "normalised");
}

/* Faculty is required for LASU -- Department cannot be picked without it. */
export function missingField(form: AcademicFormState) {
  if (!form.school) return "School";
  if (form.school === "LASU" && !form.faculty) return "Faculty";
  if (!form.department) return "Department";
  if (!form.level) return "Level";
  return null;
}

export function reasonShortfall(form: AcademicFormState) {
  return MIN_REASON - form.reason.trim().length;
}

export function canReview(diff: DiffRow[], form: AcademicFormState) {
  return hasAnyChange(diff) && !missingField(form) && reasonShortfall(form) <= 0;
}

/* Why the Review button is still disabled, in the admin's words. */
export function blockedReason(diff: DiffRow[], form: AcademicFormState) {
  const missing = missingField(form);
  if (missing) return `${missing} is required.`;

  const left = reasonShortfall(form);
  const changed = hasAnyChange(diff);

  if (!changed && left > 0) {
    return `Change a value and add a reason (${left} more characters).`;
  }
  if (!changed) return "Nothing has changed yet.";
  if (left > 0) {
    return `Add ${left} more character${left === 1 ? "" : "s"} to the reason.`;
  }
  return "";
}

/* School drives faculty, which drives department -- as on the Courses page. */
export function applySchoolChange(
  form: AcademicFormState,
  school: string
): AcademicFormState {
  return {
    ...form,
    school,
    faculty: school === "LASUCOM" ? LASUCOM_FACULTY : "",
    department: "",
    level: getLevelOptions(school).includes(form.level) ? form.level : "",
  };
}

export function applyFacultyChange(
  form: AcademicFormState,
  faculty: string
): AcademicFormState {
  return { ...form, faculty, department: "" };
}

/* Username and uuid only -- the student's email never goes into a log. */
export function describeChange(
  identity: { username?: string | null; id: string },
  diff: DiffRow[],
  form: AcademicFormState
) {
  const parts = diff.map((row) =>
    row.kind === "unchanged"
      ? `${row.label}: unchanged (${row.before})`
      : `${row.label}: ${row.before} -> ${row.after}`
  );

  return (
    `Updated academic details for ${identity.username || "student"} (${identity.id}) — ` +
    `${parts.join("; ")}. Reason: ${form.reason.trim()}`
  );
}
