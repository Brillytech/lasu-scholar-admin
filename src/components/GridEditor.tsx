import { Columns3, Rows3, SquareDashed, Trash2 } from "lucide-react";
import type { Grid } from "../services/gridQuestions";
import {
  addColumn,
  addRow,
  countBlanks,
  removeColumn,
  removeRow,
  setCellContent,
  setColumnHeader,
  toggleCellBlank,
} from "./gridQuestionForm";

/*
  Hand-rolled editable grid for fill-in-the-blank table questions.

  Deliberately not a spreadsheet library: we need add/remove row and column,
  typing, and a per-cell blank toggle -- none of formulas, sorting, virtual
  scrolling or range selection. AG-Grid or Handsontable would be a second
  design language and a large dependency for a handful of inputs.

  Interaction note: the admin needs BOTH "type the answer into a cell" and
  "mark this cell blank", so a bare click cannot mean both. The cell body is a
  text input, and each cell carries its own small toggle button. Blank cells
  keep showing their answer -- the admin has to be able to read and edit what
  is being tested -- but are tinted and dashed so they read as holes at a
  glance.
*/

type GridEditorProps = {
  label: string;
  grid: Grid;
  onChange: (grid: Grid) => void;
};

export default function GridEditor({ label, grid, onChange }: GridEditorProps) {
  const blanks = countBlanks(grid);

  return (
    <div className="block">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
          {label}
        </span>

        <span className="text-xs font-bold text-slate-400">
          {grid.rows.length} {grid.rows.length === 1 ? "row" : "rows"} ×{" "}
          {grid.columns.length}{" "}
          {grid.columns.length === 1 ? "column" : "columns"} · {blanks}{" "}
          {blanks === 1 ? "blank" : "blanks"}
        </span>
      </div>

      <div className="rounded-2xl border border-orange/10 bg-soft p-3 dark:border-white/10 dark:bg-white/10">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange(addRow(grid))}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange/10 px-3 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
          >
            <Rows3 size={14} />
            Add Row
          </button>

          <button
            type="button"
            onClick={() => onChange(addColumn(grid))}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange/10 px-3 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
          >
            <Columns3 size={14} />
            Add Column
          </button>
        </div>

        {/* Wide tables scroll inside the card rather than stretching the modal. */}
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                {/* Spacer above the row-delete buttons. */}
                <th className="w-9" />

                {grid.columns.map((column, colIndex) => (
                  <th key={column.id} className="min-w-[150px] p-0 align-bottom">
                    <div className="flex items-center gap-1">
                      <input
                        value={column.header}
                        onChange={(e) =>
                          onChange(
                            setColumnHeader(grid, colIndex, e.target.value)
                          )
                        }
                        placeholder={`Column ${colIndex + 1}`}
                        className="h-9 w-full rounded-xl border border-orange/10 bg-white/70 px-3 text-xs font-black uppercase tracking-[0.1em] text-navy outline-none transition focus:border-orange placeholder:font-bold placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
                      />

                      <button
                        type="button"
                        title="Remove column"
                        disabled={grid.columns.length <= 1}
                        onClick={() => onChange(removeColumn(grid, colIndex))}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {grid.rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  <td className="w-9 align-middle">
                    <button
                      type="button"
                      title="Remove row"
                      disabled={grid.rows.length <= 1}
                      onClick={() => onChange(removeRow(grid, rowIndex))}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>

                  {row.cells.map((cell, colIndex) => (
                    <td key={`${row.id}-${colIndex}`} className="p-0">
                      <div
                        className={`flex items-center gap-1 rounded-xl border px-1 transition ${
                          cell.blank
                            ? "border-dashed border-orange bg-orange/10"
                            : "border-orange/10 bg-white/70 dark:border-white/10 dark:bg-slate-950/40"
                        }`}
                      >
                        <input
                          value={cell.content}
                          onChange={(e) =>
                            onChange(
                              setCellContent(
                                grid,
                                rowIndex,
                                colIndex,
                                e.target.value
                              )
                            )
                          }
                          placeholder="Answer"
                          data-testid={`cell-${rowIndex}-${colIndex}`}
                          className="h-10 w-full bg-transparent px-2 text-sm font-bold text-navy outline-none placeholder:font-semibold placeholder:text-slate-400 dark:text-white"
                        />

                        <button
                          type="button"
                          title={
                            cell.blank
                              ? "This cell is a blank — click to make it visible"
                              : "Make this cell a blank for students"
                          }
                          aria-pressed={cell.blank}
                          data-testid={`blank-${rowIndex}-${colIndex}`}
                          onClick={() =>
                            onChange(toggleCellBlank(grid, rowIndex, colIndex))
                          }
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                            cell.blank
                              ? "bg-orange text-white"
                              : "text-slate-400 hover:bg-orange/10 hover:text-orange"
                          }`}
                        >
                          <SquareDashed size={13} />
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400">
        Type the correct answer in every cell, then use the
        <SquareDashed size={12} className="inline" />
        toggle to mark which cells students must fill in.
      </p>
    </div>
  );
}
