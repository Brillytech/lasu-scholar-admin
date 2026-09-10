import { GRID_VERSION } from "../services/gridQuestions";
import type { Grid, GridCell, GridRow } from "../services/gridQuestions";

/*
  Form shape and pure grid operations for the fill-in-the-blank table editor.

  Component-free on purpose, the same way theoryQuestionForm is: Questions.tsx
  imports emptyGridForm as a VALUE, and a static value import of the modal
  would drag TipTap/MathLive/KaTeX into the entry chunk and silently collapse
  the React.lazy split. Keep components out of this file.

  Every operation returns a NEW grid rather than mutating, and each one ends by
  running normalizeGrid so a row can never disagree with the column count --
  cells are positional, so an unpadded row would silently shift every answer
  after a column insert.
*/

export type GridFormState = {
  course_id: string;
  topic_id: string;
  prompt_html: string;
  prompt_text: string;
  grid: Grid;
  marks: string;
};

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function emptyCell(): GridCell {
  return { content: "", blank: false };
}

/*
  Guarantees the structural invariant the rest of the editor assumes:
  every row has exactly one cell per column, in column order.
*/
export function normalizeGrid(grid: Grid): Grid {
  const columns = grid.columns.map((column) => ({
    id: column.id || makeId(),
    header: column.header ?? "",
  }));

  return {
    version: grid.version || GRID_VERSION,
    columns,
    rows: grid.rows.map((row) => {
      const cells = Array.isArray(row.cells) ? row.cells : [];

      return {
        id: row.id || makeId(),
        cells: columns.map(
          (_, index) =>
            cells[index] || emptyCell()
        ),
      };
    }),
  };
}

export function createEmptyGrid(rowCount = 2, colCount = 2): Grid {
  const columns = Array.from({ length: colCount }, () => ({
    id: makeId(),
    header: "",
  }));

  const rows: GridRow[] = Array.from({ length: rowCount }, () => ({
    id: makeId(),
    cells: columns.map(emptyCell),
  }));

  return { version: GRID_VERSION, columns, rows };
}

export function addRow(grid: Grid): Grid {
  return normalizeGrid({
    ...grid,
    rows: [...grid.rows, { id: makeId(), cells: grid.columns.map(emptyCell) }],
  });
}

export function removeRow(grid: Grid, rowIndex: number): Grid {
  return normalizeGrid({
    ...grid,
    rows: grid.rows.filter((_, index) => index !== rowIndex),
  });
}

export function addColumn(grid: Grid): Grid {
  return normalizeGrid({
    ...grid,
    columns: [...grid.columns, { id: makeId(), header: "" }],
    rows: grid.rows.map((row) => ({
      ...row,
      cells: [...row.cells, emptyCell()],
    })),
  });
}

export function removeColumn(grid: Grid, colIndex: number): Grid {
  return normalizeGrid({
    ...grid,
    columns: grid.columns.filter((_, index) => index !== colIndex),
    rows: grid.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, index) => index !== colIndex),
    })),
  });
}

export function setColumnHeader(
  grid: Grid,
  colIndex: number,
  header: string
): Grid {
  return normalizeGrid({
    ...grid,
    columns: grid.columns.map((column, index) =>
      index === colIndex ? { ...column, header } : column
    ),
  });
}

function patchCell(
  grid: Grid,
  rowIndex: number,
  colIndex: number,
  patch: Partial<GridCell>
): Grid {
  return normalizeGrid({
    ...grid,
    rows: grid.rows.map((row, r) =>
      r !== rowIndex
        ? row
        : {
            ...row,
            cells: row.cells.map((cell, c) =>
              c === colIndex ? { ...cell, ...patch } : cell
            ),
          }
    ),
  });
}

export function setCellContent(
  grid: Grid,
  rowIndex: number,
  colIndex: number,
  content: string
): Grid {
  return patchCell(grid, rowIndex, colIndex, { content });
}

export function toggleCellBlank(
  grid: Grid,
  rowIndex: number,
  colIndex: number
): Grid {
  const current = grid.rows[rowIndex]?.cells[colIndex];

  return patchCell(grid, rowIndex, colIndex, { blank: !current?.blank });
}

export function countBlanks(grid: Grid): number {
  return grid.rows.reduce(
    (total, row) => total + row.cells.filter((cell) => cell.blank).length,
    0
  );
}

/*
  A grid is only answerable if at least one cell is marked blank and every
  blank has an answer to check against. Returned as a message so the modal can
  say what is wrong rather than just refusing to save.
*/
export function validateGrid(grid: Grid): string | null {
  if (grid.columns.length === 0 || grid.rows.length === 0) {
    return "Add at least one row and one column.";
  }

  const blanks = countBlanks(grid);

  if (blanks === 0) {
    return "Mark at least one cell as a blank for students to fill in.";
  }

  const emptyBlank = grid.rows.some((row) =>
    row.cells.some((cell) => cell.blank && !cell.content.trim())
  );

  if (emptyBlank) {
    return "Every blank needs the correct answer typed into it.";
  }

  return null;
}

export const emptyGridForm: GridFormState = {
  course_id: "",
  topic_id: "",
  prompt_html: "",
  prompt_text: "",
  grid: createEmptyGrid(),
  marks: "",
};
