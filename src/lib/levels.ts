/*
  Single source of truth for academic level options.

  Every admin page that renders a Level dropdown reads from here. Each page
  used to keep its own copy of this list, and they drifted: Courses offered
  100L-600L for LASUCOM while Topics/Questions/Materials/Practice/Exams
  started at 200L, so admins could not create content for real LASUCOM 100L
  students. Add levels here and nowhere else.
*/

export const LASU_LEVELS = ["100L", "200L", "300L", "400L", "500L"];

/*
  LASUCOM runs through to 600L, and 100L is a real department level there.

  Block vs semester is a *period type* (see getAcademicPeriodType in
  services/courses.ts) — it describes how a level is divided, not which
  levels exist. It must never be used to trim this list.
*/
export const LASUCOM_LEVELS = ["100L", "200L", "300L", "400L", "500L", "600L"];

/* Widest valid set — for places that target levels across every school. */
export const ALL_LEVELS = LASUCOM_LEVELS;

export function getLevelOptions(school: string) {
  return school === "LASUCOM" ? LASUCOM_LEVELS : LASU_LEVELS;
}

/*
  Older signups stored levels as "100 Level" rather than "100L". Courses,
  shares and period controls are all matched on the level string by exact
  equality, so a legacy value matches nothing — the student opens the app
  and sees no courses at all. Normalise on read for display and on write
  so the stored value is repaired.

  Returns the input trimmed if it matches no known level, so an unexpected
  value is passed through visibly rather than silently blanked.
*/
export function normalizeLevel(value?: string | null) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  const digits = clean.match(/^(\d{3})\s*(?:L|Level)?$/i);
  if (digits) {
    const canonical = `${digits[1]}L`;
    return ALL_LEVELS.includes(canonical) ? canonical : clean;
  }

  return clean;
}
