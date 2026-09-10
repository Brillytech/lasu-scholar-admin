/*
  Canonical answer-matching rule for fill-in-the-blank grid questions.

  This file is the single source of truth referenced by the GRADING section of
  supabase/sql/002_grid_questions.sql. The student app lives in a separate
  codebase; if it reimplements this rule rather than porting this file, the two
  will drift and admin preview will disagree with student results. Keep it
  dependency-free so it can be copied across verbatim.

  The rule, applied to BOTH the stored cell content and the submitted answer:

      trim -> collapse internal whitespace to one space -> case-fold

  Deliberately NOT fuzzy/edit-distance matching. In a medical and pharmacology
  context "hypoglycaemia" and "hyperglycaemia" are two edits apart, so
  accepting near-misses would mark a dangerous answer correct.

  Trailing punctuation, accents and hyphenation are intentionally left alone:
  stripping them silently widens what counts as correct, and where a question
  genuinely has more than one acceptable spelling the intended answer is
  per-blank alternates (see below), not a looser global rule.
*/

export function normalizeGridAnswer(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

/*
  `accepted` carries the planned v2 shape: alternate answers stored per cell
  ("accept": ["G6P", "glucose-6-phosphate"]). Passing none simply compares
  against the stored content, which is the v1 behaviour.
*/
export function gridAnswerMatches(
  submitted: string | null | undefined,
  correct: string | null | undefined,
  accepted?: (string | null | undefined)[]
): boolean {
  const answer = normalizeGridAnswer(submitted);

  if (!answer) return false;

  const candidates = [correct, ...(accepted || [])]
    .map(normalizeGridAnswer)
    .filter(Boolean);

  return candidates.includes(answer);
}
