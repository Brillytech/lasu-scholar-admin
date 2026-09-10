import { X } from "lucide-react";
import type { Course } from "../services/courses";
import type { Topic } from "../services/topics";
import type { GridQuestion } from "../services/gridQuestions";
import type { GridFormState } from "./gridQuestionForm";
import { validateGrid } from "./gridQuestionForm";
import { Input, Select } from "./FormFields";
import GridEditor from "./GridEditor";
import GridPreview from "./GridPreview";
import RichMathEditor from "./RichMathEditor";
import RenderedContent from "./RenderedContent";

/*
  Add/edit modal for fill-in-the-blank table questions.

  Same shape as TheoryQuestionModal and, like it, this component IS the lazy
  boundary -- Questions loads it with React.lazy, so the rich-text prompt editor
  can be imported normally here and still stay out of the entry chunk.

  Cells are plain text in v1. The prompt above the table uses the existing rich
  text editor, so an equation can be set in the question stem even though cells
  cannot hold one yet.
*/

type GridQuestionModalProps = {
  editing: GridQuestion | null;
  form: GridFormState;
  onFormChange: (updater: (prev: GridFormState) => GridFormState) => void;
  courses: Course[];
  topics: Topic[];
  periodName?: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

export default function GridQuestionModal({
  editing,
  form,
  onFormChange,
  courses,
  topics,
  periodName,
  saving,
  onClose,
  onSave,
}: GridQuestionModalProps) {
  /*
    Surfaced live rather than only on save, so an admin sees "mark at least one
    cell as a blank" while building the table instead of after pressing Save.
  */
  const gridProblem = validateGrid(form.grid);

  function handleCourseChange(value: string) {
    const firstTopic = topics.find((topic) => topic.course_id === value);

    onFormChange((prev) => ({
      ...prev,
      course_id: value,
      topic_id: firstTopic?.id || "",
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-4xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
              {editing ? "Edit Table Question" : "New Table Question"}
            </p>
            <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
              {editing ? "Update Question" : "Add Table Question"}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Saved under {periodName || "the selected workspace period"}.
            </p>
          </div>

          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Course"
            value={form.course_id}
            onChange={handleCourseChange}
            options={courses.map((course) => ({
              label: `${course.code} - ${course.title}`,
              value: course.id,
            }))}
          />

          <Select
            label="Topic"
            value={form.topic_id}
            onChange={(value) =>
              onFormChange((prev) => ({ ...prev, topic_id: value }))
            }
            options={topics
              .filter((topic) => topic.course_id === form.course_id)
              .map((topic) => ({ label: topic.title, value: topic.id }))}
          />
        </div>

        <div className="mt-4">
          <RichMathEditor
            label="Question Prompt (optional)"
            value={form.prompt_html}
            minHeight={120}
            onChange={({ html, text }) =>
              onFormChange((prev) => ({
                ...prev,
                prompt_html: html,
                prompt_text: text,
              }))
            }
          />
        </div>

        <div className="mt-4">
          <GridEditor
            label="Table"
            grid={form.grid}
            onChange={(grid) => onFormChange((prev) => ({ ...prev, grid }))}
          />
        </div>

        <div className="mt-4 md:max-w-[200px]">
          <Input
            label="Marks (optional)"
            value={form.marks}
            onChange={(value) =>
              onFormChange((prev) => ({ ...prev, marks: value }))
            }
          />
        </div>

        <div className="mt-5 rounded-[24px] border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
            Student Preview
          </p>

          <div className="mt-3" data-testid="grid-student-preview">
            {form.prompt_text.trim() && (
              <RenderedContent html={form.prompt_html} className="mb-3" />
            )}

            {/* reveal={false}: blanks render empty, exactly as a student meets them. */}
            <GridPreview grid={form.grid} reveal={false} />
          </div>
        </div>

        {gridProblem && (
          <p
            data-testid="grid-problem"
            className="mt-4 rounded-2xl border border-orange/20 bg-orange/10 px-4 py-3 text-sm font-bold text-orange"
          >
            {gridProblem}
          </p>
        )}

        <button
          onClick={onSave}
          disabled={saving || Boolean(gridProblem)}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : editing ? "Save Changes" : "Save Question"}
        </button>
      </div>
    </div>
  );
}
