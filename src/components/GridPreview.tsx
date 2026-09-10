import type { Grid } from "../services/gridQuestions";

/*
  Read-only render of a grid.

  Two audiences, one component:
  - reveal=false is the student's view -- blanks render as empty slots. This is
    what the modal previews, so an admin can confirm the shape of the question
    before saving.
  - reveal=true keeps the answers visible but tinted, for the admin list where
    the point is reviewing what was set.
*/

type GridPreviewProps = {
  grid: Grid;
  reveal?: boolean;
  className?: string;
};

export default function GridPreview({
  grid,
  reveal = false,
  className = "",
}: GridPreviewProps) {
  if (!grid || grid.columns.length === 0 || grid.rows.length === 0) {
    return (
      <p className="text-sm font-semibold text-slate-400">
        Nothing to preview yet.
      </p>
    );
  }

  const hasHeaders = grid.columns.some((column) => column.header.trim());

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-sm">
        {hasHeaders && (
          <thead>
            <tr>
              {grid.columns.map((column) => (
                <th
                  key={column.id}
                  className="border border-orange/15 bg-orange/10 px-3 py-2 text-left text-xs font-black uppercase tracking-[0.1em] text-orange dark:border-white/10"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
        )}

        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, colIndex) => {
                const hidden = cell.blank && !reveal;

                return (
                  <td
                    key={`${row.id}-${colIndex}`}
                    className={`border border-orange/15 px-3 py-2 align-middle font-semibold dark:border-white/10 ${
                      cell.blank
                        ? "bg-orange/5 text-orange"
                        : "text-slate-600 dark:text-slate-200"
                    }`}
                  >
                    {hidden ? (
                      /*
                        A visible ruled slot rather than whitespace, so an empty
                        answer cell and a fillable blank never look the same.
                      */
                      <span className="inline-block min-w-[90px] border-b-2 border-dashed border-orange/50 py-1" />
                    ) : (
                      cell.content || (
                        <span className="text-slate-300 dark:text-slate-600">
                          —
                        </span>
                      )
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
