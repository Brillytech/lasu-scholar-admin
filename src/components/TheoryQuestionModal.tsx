import { X } from "lucide-react";
import type { Course } from "../services/courses";
import type { Topic } from "../services/topics";
import type { TheoryQuestion } from "../services/theoryQuestions";
import type { TheoryFormState } from "./theoryQuestionForm";
import { Input, Select } from "./FormFields";
import RichMathEditor from "./RichMathEditor";
import RenderedContent from "./RenderedContent";

/*
  Add/edit modal for free-text theory questions.

  Lifted out of Questions.tsx, which had grown past 2,000 lines with a third
  question type still to come. This component IS the lazy boundary: Questions
  loads it with React.lazy, so RichMathEditor / RenderedContent (and through
  them TipTap, MathLive, KaTeX and DOMPurify) can be imported normally here and
  still stay out of the initial bundle.

  The form shape lives in ./theoryQuestionForm so Questions can import it as a
  value without statically pulling this module -- and its editors -- into the
  initial bundle.
*/

type TheoryQuestionModalProps = {
  editing: TheoryQuestion | null;
  form: TheoryFormState;
  onFormChange: (updater: (prev: TheoryFormState) => TheoryFormState) => void;
  courses: Course[];
  topics: Topic[];
  periodName?: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

export default function TheoryQuestionModal({
  editing,
  form,
  onFormChange,
  courses,
  topics,
  periodName,
  saving,
  onClose,
  onSave,
}: TheoryQuestionModalProps) {
  /*
    Changing course clears the topic, since topics belong to a course and the
    previous selection would no longer be valid.
  */
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
      <div className="mx-auto w-full max-w-3xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
              {editing ? "Edit Theory Question" : "New Theory Question"}
            </p>
            <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
              {editing ? "Update Question" : "Add Theory Question"}
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
            label="Question"
            value={form.question_html}
            onChange={({ html, text }) =>
              onFormChange((prev) => ({
                ...prev,
                question_html: html,
                question_text: text,
              }))
            }
          />
        </div>

        <div className="mt-4">
          <RichMathEditor
            label="Model Answer (optional)"
            value={form.answer_html}
            minHeight={140}
            onChange={({ html, text }) =>
              onFormChange((prev) => ({
                ...prev,
                answer_html: html,
                answer_text: text,
              }))
            }
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

        {/*
          Renders the exact HTML that will be stored, through the same
          sanitize-then-KaTeX path the list and (later) the student app use --
          so this previews what is saved, not what the editor happens to be
          showing.
        */}
        <div className="mt-5 rounded-[24px] border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
            Student Preview
          </p>

          <div className="mt-3">
            {form.question_text.trim() ? (
              <RenderedContent html={form.question_html} />
            ) : (
              <p className="text-sm font-semibold text-slate-400">
                Nothing to preview yet.
              </p>
            )}

            {form.answer_text.trim() && (
              <div className="mt-4 border-t border-orange/10 pt-4 dark:border-white/10">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Model Answer
                </p>
                <RenderedContent html={form.answer_html} />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : editing ? "Save Changes" : "Save Question"}
        </button>
      </div>
    </div>
  );
}
