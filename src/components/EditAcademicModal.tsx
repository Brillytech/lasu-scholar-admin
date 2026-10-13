import { useMemo, useState } from "react";
import { AlertTriangle, Lock, X } from "lucide-react";
import {
  getDepartmentOptions,
  getFacultyOptions,
  LASUCOM_FACULTY,
  SCHOOLS,
} from "../lib/academics";
import { getLevelOptions, normalizeLevel } from "../lib/levels";
import { createAdminLog } from "../services/adminLogs";
import type { Student } from "../services/students";
import {
  AcademicUpdateMismatchError,
  updateStudentAcademicDetails,
} from "../services/students";
import type { AcademicFormState, DiffKind } from "./academicEditForm";
import {
  applyFacultyChange,
  applySchoolChange,
  blockedReason as blockedReasonFor,
  buildDiff,
  canReview as canReviewNow,
  describeChange,
  formFromStudent,
  MIN_REASON,
  movesCohort as movesCohortIn,
  repairsOnly as repairsOnlyIn,
} from "./academicEditForm";
import SearchableSelect from "./SearchableSelect";
import SelectRaw from "./SelectRaw";

/*
  Corrects the academic details a student locked in during profile setup.

  Students reach an admin over WhatsApp when they pick the wrong
  School/Faculty/Department/Level, and the dashboard had nowhere to act on it.

  Two steps on purpose: the form, then a before -> after review. Level and
  Department decide which courses a student can see, so the admin confirms the
  cohort consequences rather than discovering them afterwards.

  Role and email are never editable here and never reach the update payload.

  The decision logic lives in ./academicEditForm so each state can be
  exercised without rendering.
*/

type EditAcademicModalProps = {
  student: Student;
  adminId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type SaveResult =
  | { kind: "ok" }
  | { kind: "update"; message: string }
  | { kind: "stick"; mismatches: AcademicUpdateMismatchError["mismatches"] }
  | { kind: "log"; message: string };

/* Supabase rejects with an Error; anything else is still reported, not hidden. */
function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

export default function EditAcademicModal({
  student,
  adminId,
  onClose,
  onSaved,
}: EditAcademicModalProps) {
  const [form, setForm] = useState<AcademicFormState>(() =>
    formFromStudent(student)
  );
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const diff = useMemo(() => buildDiff(student, form), [student, form]);

  const movesCohort = movesCohortIn(diff);
  const repairsOnly = repairsOnlyIn(diff);
  const canReview = canReviewNow(diff, form);
  const blockedReason = blockedReasonFor(diff, form);

  const facultyLocked = form.school === "LASUCOM";
  const departmentOptions = getDepartmentOptions(form.school, form.faculty);
  const levelOptions = getLevelOptions(form.school);

  const target = `${form.school} / ${form.department} / ${form.level}`;
  const legacyLevel = normalizeLevel(student.level) !== String(student.level || "");

  async function handleSave() {
    if (saving) return;

    setSaving(true);

    try {
      await updateStudentAcademicDetails(student.id, {
        school: form.school,
        faculty: form.faculty,
        department: form.department,
        level: form.level,
      });
    } catch (error) {
      if (error instanceof AcademicUpdateMismatchError) {
        /*
          The update was accepted, so some fields may have stuck even though
          others did not. Refresh so the list shows what is actually stored.
        */
        setResult({ kind: "stick", mismatches: error.mismatches });
        setSaving(false);
        onSaved();
        return;
      }

      setResult({ kind: "update", message: messageFrom(error) });
      setSaving(false);
      return;
    }

    /*
      The profile is already changed and verified by this point, so a failed
      log entry is reported as its own outcome rather than rolled into the
      error path -- the admin must not retry the save.
    */
    try {
      await createAdminLog({
        admin_id: adminId,
        action: "UPDATE_STUDENT_ACADEMIC",
        target_table: "profiles",
        target_id: student.id,
        description: describeChange(student, diff, form),
      });
    } catch (error) {
      setResult({ kind: "log", message: messageFrom(error) });
      setSaving(false);
      onSaved();
      return;
    }

    setResult({ kind: "ok" });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-2xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
              {result
                ? result.kind === "ok"
                  ? "Saved"
                  : "Save failed"
                : step === "confirm"
                ? "Confirm change"
                : "Edit academic details"}
            </p>
            <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
              {student.full_name || student.username || "No name"}
            </h3>
            <p className="mt-1 break-words text-sm font-semibold text-slate-500 dark:text-slate-300">
              {student.username || "No username"}
              {student.created_at
                ? ` · joined ${new Date(student.created_at).toLocaleString()}`
                : ""}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white disabled:opacity-60 dark:bg-white/10 dark:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {result ? (
          <ResultPanel
            result={result}
            student={student}
            form={form}
            onBack={() => setResult(null)}
            onClose={onClose}
          />
        ) : step === "form" ? (
          <>
            <div className="flex items-center gap-2 rounded-2xl bg-soft px-4 py-3 text-xs font-black text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
              <Lock size={14} />
              Role and email cannot be changed here.
            </div>

            {legacyLevel && (
              <div className="mt-4 rounded-3xl border-l-4 border-amber-500/50 bg-amber-500/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                  Legacy level value
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  Stored as{" "}
                  <span className="font-black text-navy dark:text-white">
                    {student.level}
                  </span>
                  . Saving writes the canonical{" "}
                  <span className="font-black text-navy dark:text-white">
                    {normalizeLevel(student.level)}
                  </span>
                  , which is what courses and period controls are matched on.
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectRaw
                label="School *"
                value={form.school}
                onChange={(value) => setForm((prev) => applySchoolChange(prev, value))}
                options={SCHOOLS}
              />

              {facultyLocked ? (
                <div>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                    Faculty
                  </span>
                  <div className="flex h-12 items-center gap-2 rounded-2xl border border-dashed border-orange/20 bg-soft px-4 text-sm font-black text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                    <Lock size={13} />
                    {LASUCOM_FACULTY}
                    <span className="ml-auto text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                      Fixed
                    </span>
                  </div>
                </div>
              ) : (
                <SelectRaw
                  label="Faculty *"
                  value={form.faculty}
                  onChange={(value) => setForm((prev) => applyFacultyChange(prev, value))}
                  options={["", ...getFacultyOptions(form.school)]}
                />
              )}

              <SearchableSelect
                label="Department *"
                value={form.department}
                onChange={(value) => setForm((prev) => ({ ...prev, department: value }))}
                options={departmentOptions.map((item) => ({ label: item, value: item }))}
                placeholder="Select Department"
                emptyMessage={
                  form.school === "LASU" && !form.faculty
                    ? "Select a faculty first"
                    : "No departments found"
                }
              />

              <SelectRaw
                label="Level *"
                value={form.level}
                onChange={(value) => setForm((prev) => ({ ...prev, level: value }))}
                options={form.level ? levelOptions : ["", ...levelOptions]}
              />

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                  Reason for change *
                </span>
                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  rows={3}
                  placeholder="What did the student get wrong, and how was the correction confirmed?"
                  className="w-full rounded-2xl border border-orange/10 bg-soft px-4 py-3 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
                />
                <p className="mt-2 text-xs font-bold text-slate-400">
                  Saved to admin logs. Minimum {MIN_REASON} characters.
                </p>
              </label>
            </div>

            {blockedReason && (
              <p className="mt-4 text-right text-xs font-bold text-slate-400">
                {blockedReason}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-2xl bg-soft px-5 py-3 text-sm font-black text-navy transition hover:scale-[1.02] dark:bg-white/10 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={!canReview}
                className="rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
              >
                Review changes
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="overflow-x-auto rounded-3xl border border-orange/10 dark:border-white/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-orange/10 bg-soft/80 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/10 dark:bg-slate-950/40">
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">Before</th>
                    <th className="px-4 py-3">After</th>
                    <th className="hidden px-4 py-3 sm:table-cell">State</th>
                  </tr>
                </thead>

                <tbody>
                  {diff.map((row) => (
                    <tr
                      key={row.field}
                      className="border-b border-orange/10 last:border-0 dark:border-white/10"
                    >
                      <td className="px-4 py-3 text-sm font-black text-navy dark:text-white">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {row.before}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${
                          row.kind === "unchanged"
                            ? "font-semibold text-slate-600 dark:text-slate-300"
                            : "font-black text-navy dark:text-white"
                        }`}
                      >
                        {row.after}
                        {row.kind !== "unchanged" && (
                          <StateTag kind={row.kind} className="mt-2 sm:hidden" />
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <StateTag kind={row.kind} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {movesCohort ? (
              <div className="mt-5 rounded-3xl border-l-4 border-amber-500/50 bg-amber-500/10 p-5">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={14} />
                  This moves the student to another cohort
                </p>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  <li>
                    <b className="font-black text-navy dark:text-white">Course list.</b>{" "}
                    Courses are matched on School + Department + Level by exact text.
                    After saving they see{" "}
                    <b className="font-black text-navy dark:text-white">{target}</b>{" "}
                    courses and lose sight of the ones they have now.
                  </li>
                  <li>
                    <b className="font-black text-navy dark:text-white">
                      Progress is kept.
                    </b>{" "}
                    Attempts are stored per course, so none are deleted.
                  </li>
                  <li>
                    <b className="font-black text-navy dark:text-white">
                      Active semester or block
                    </b>{" "}
                    comes from the period control for the new cohort. Check one exists
                    for <b className="font-black text-navy dark:text-white">{target}</b>{" "}
                    on the Courses page, or they may see no active period.
                  </li>
                </ul>
              </div>
            ) : repairsOnly ? (
              <div className="mt-5 rounded-3xl border-l-4 border-amber-500/50 bg-amber-500/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
                  Repairs the stored value
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  This repairs the stored value. The student currently matches no
                  courses and will start seeing{" "}
                  <b className="font-black text-navy dark:text-white">{target}</b>{" "}
                  courses.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border-l-4 border-green-500/50 bg-green-500/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-green-700 dark:text-green-300">
                  No cohort move
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  Level and Department are unchanged, so the student's course list,
                  progress and active period are unaffected.
                </p>
              </div>
            )}

            <div className="mt-5 rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Reason
              </p>
              <p className="mt-2 text-sm font-bold text-navy dark:text-white">
                {form.reason.trim()}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                disabled={saving}
                className="rounded-2xl bg-soft px-5 py-3 text-sm font-black text-navy transition hover:scale-[1.02] disabled:opacity-60 dark:bg-white/10 dark:text-white"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-navy px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 dark:bg-white/10"
              >
                {saving ? "Saving..." : "Save change"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StateTag({ kind, className = "" }: { kind: DiffKind; className?: string }) {
  const tone =
    kind === "changed"
      ? "bg-orange/10 text-orange"
      : kind === "normalised"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "bg-soft text-slate-400 dark:bg-white/10";

  return (
    <span
      className={`inline-block w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${tone} ${className}`}
    >
      {kind}
    </span>
  );
}

function ResultPanel({
  result,
  student,
  form,
  onBack,
  onClose,
}: {
  result: SaveResult;
  student: Student;
  form: AcademicFormState;
  onBack: () => void;
  onClose: () => void;
}) {
  if (result.kind === "ok") {
    return (
      <>
        <div className="rounded-3xl border-l-4 border-green-500/50 bg-green-500/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-green-700 dark:text-green-300">
            Academic details updated
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            Saved and verified against the stored row, and recorded in admin logs.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02]"
          >
            Done
          </button>
        </div>
      </>
    );
  }

  const body =
    result.kind === "update" ? (
      <>
        The database rejected the update:{" "}
        <b className="font-black text-navy dark:text-white">{result.message}</b>. Nothing
        was changed and nothing was logged. Check you are still signed in as an admin,
        then try again.
      </>
    ) : result.kind === "stick" ? (
      <>
        The update was accepted but reading the row back disagreed with what was sent, so
        this has <b className="font-black text-navy dark:text-white">not</b> been treated
        as a success and no log entry was written.
        <span className="mt-3 block">
          {result.mismatches.map((item) => (
            <span key={item.field} className="block">
              {item.field}: sent{" "}
              <b className="font-black text-navy dark:text-white">{item.sent}</b>, stored{" "}
              <b className="font-black text-navy dark:text-white">
                {item.stored || "empty"}
              </b>
            </span>
          ))}
        </span>
      </>
    ) : (
      <>
        {student.username || "The student"}'s academic details were updated to{" "}
        <b className="font-black text-navy dark:text-white">
          {form.school} / {form.department} / {form.level}
        </b>{" "}
        and verified. The admin log entry could not be written:{" "}
        <b className="font-black text-navy dark:text-white">{result.message}</b>. The
        change is live but unrecorded — note it manually, and do not repeat the save.
      </>
    );

  return (
    <>
      <div className="rounded-3xl border-l-4 border-red-500/50 bg-red-500/10 p-5">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-red-700 dark:text-red-300">
          <AlertTriangle size={14} />
          {result.kind === "update"
            ? "Could not save the change"
            : result.kind === "stick"
            ? "The change did not stick"
            : "Profile changed, but the log entry failed"}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          {body}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {result.kind === "log" ? (
          <button
            onClick={onClose}
            className="rounded-2xl bg-navy px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02] dark:bg-white/10"
          >
            Close
          </button>
        ) : (
          <button
            onClick={onBack}
            className="rounded-2xl bg-soft px-5 py-3 text-sm font-black text-navy transition hover:scale-[1.02] dark:bg-white/10 dark:text-white"
          >
            Back to changes
          </button>
        )}
      </div>
    </>
  );
}
