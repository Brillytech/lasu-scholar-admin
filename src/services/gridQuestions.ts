import { supabase } from "../lib/supabase";

/*
  Fill-in-the-blank table ("grid") questions.

  Third question type alongside ./questions.ts (MCQ) and ./theoryQuestions.ts
  (free text). Same topic/course linkage and the same embedded relation shape,
  so the Questions page reuses its courseById map and filter logic for all
  three tabs.

  Storage contract: the whole grid lives in one jsonb column. row_count,
  col_count and blank_count are DERIVED BY A DATABASE TRIGGER from that grid
  and are never sent from here -- a client cannot make them drift.

  Cells are plain text in v1. The maths upgrade path is a shared equation
  modal writing "$...$" into a cell; because cells live in jsonb that needs
  no migration.
*/

export type GridCell = {
  content: string;
  blank: boolean;
};

export type GridColumn = {
  id: string;
  header: string;
};

export type GridRow = {
  id: string;
  cells: GridCell[];
};

export type Grid = {
  version: number;
  columns: GridColumn[];
  rows: GridRow[];
};

export const GRID_VERSION = 1;

export type GridQuestion = {
  id: string;
  course_id: string;
  topic_id: string;
  prompt_html: string | null;
  prompt_text: string;
  grid: Grid;
  row_count: number;
  col_count: number;
  blank_count: number;
  marks: number | null;
  difficulty: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  courses?: {
    id?: string;
    code: string;
    title: string;
    school?: string | null;
    faculty?: string | null;
    department?: string | null;
    level?: string | null;
    semester?: string | null;
    academic_period_id?: string | null;
    academic_periods?: {
      id: string;
      name: string;
      period_type: "semester" | "block";
    } | null;
  };
  topics?: {
    id?: string;
    title: string;
  };
};

export type GridQuestionPayload = {
  course_id: string;
  topic_id: string;
  prompt_html?: string | null;
  prompt_text?: string | null;
  grid: Grid;
  marks?: number | string | null;
  position?: number;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

/*
  `marks` is an integer column but the form field hands us a string, and an
  empty one must become NULL rather than "" (which Postgres rejects).
*/
function toMarks(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.trunc(parsed);
}

/*
  Mirrors the grid_questions_grid_shape CHECK constraint so a malformed grid
  fails here, with a message that says what is wrong, rather than coming back
  from PostgREST as an opaque 23514.
*/
function toGrid(grid: Grid): Grid {
  if (!grid || typeof grid !== "object") {
    throw new Error("Grid is missing.");
  }

  if (!Array.isArray(grid.columns) || !Array.isArray(grid.rows)) {
    throw new Error("Grid must have a columns array and a rows array.");
  }

  return {
    version: grid.version || GRID_VERSION,
    columns: grid.columns.map((column) => ({
      id: column.id,
      header: clean(column.header),
    })),
    rows: grid.rows.map((row) => ({
      id: row.id,
      cells: (Array.isArray(row.cells) ? row.cells : []).map((cell) => ({
        content: clean(cell?.content),
        blank: Boolean(cell?.blank),
      })),
    })),
  };
}

/*
  row_count / col_count / blank_count are deliberately absent: the
  grid_questions_sync trigger derives them on every insert and update, and
  anything sent from here would simply be overwritten.
*/
function toRow(payload: GridQuestionPayload) {
  return {
    course_id: payload.course_id,
    topic_id: payload.topic_id,
    prompt_html: clean(payload.prompt_html),
    prompt_text: clean(payload.prompt_text),
    grid: toGrid(payload.grid),
    marks: toMarks(payload.marks),
    position: payload.position ?? 0,
  };
}

export async function getGridQuestions(filters?: {
  course_ids?: string[];
  topic_ids?: string[];
}) {
  if (filters?.course_ids && filters.course_ids.length === 0) {
    return [] as GridQuestion[];
  }

  if (filters?.topic_ids && filters.topic_ids.length === 0) {
    return [] as GridQuestion[];
  }

  let query = supabase
    .from("grid_questions")
    .select(
      `
      *,
      courses (
        id,
        code,
        title,
        school,
        faculty,
        department,
        level,
        semester,
        academic_period_id,
        academic_periods (
          id,
          name,
          period_type
        )
      ),
      topics (
        id,
        title
      )
    `
    )
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.course_ids && filters.course_ids.length > 0) {
    query = query.in("course_id", filters.course_ids);
  }

  if (filters?.topic_ids && filters.topic_ids.length > 0) {
    query = query.in("topic_id", filters.topic_ids);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data as GridQuestion[];
}

export async function createGridQuestion(
  payload: GridQuestionPayload & { created_by?: string | null }
) {
  const { data, error } = await supabase
    .from("grid_questions")
    .insert({
      ...toRow(payload),
      created_by: payload.created_by || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data as GridQuestion;
}

/*
  .select().single() is not decoration. RLS UPDATE/DELETE policies filter rows
  through their USING clause rather than raising, so a non-admin's write
  silently affects zero rows. Asking for the row back turns that silence into
  a thrown error instead of a save that appears to succeed.
*/
export async function updateGridQuestion(
  id: string,
  payload: GridQuestionPayload
) {
  const { data, error } = await supabase
    .from("grid_questions")
    .update(toRow(payload))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as GridQuestion;
}

export async function deleteGridQuestion(id: string) {
  const { error } = await supabase
    .from("grid_questions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
