import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Eye,
  Search,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { PracticeAnswer, PracticeAttempt } from "../services/practice";
import { getPracticeAnswers, getPracticeAttempts } from "../services/practice";

export default function Practice() {
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<PracticeAttempt | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    loadAttempts();
  }, []);

  async function loadAttempts() {
    try {
      setLoading(true);
      const data = await getPracticeAttempts();
      setAttempts(data);
    } catch (error: any) {
      alert(error.message || "Could not load practice attempts.");
    } finally {
      setLoading(false);
    }
  }

  async function openAttempt(attempt: PracticeAttempt) {
    try {
      setSelectedAttempt(attempt);
      setAnswersLoading(true);
      const data = await getPracticeAnswers(attempt.id);
      setAnswers(data);
    } catch (error: any) {
      alert(error.message || "Could not load attempt answers.");
    } finally {
      setAnswersLoading(false);
    }
  }

  const filteredAttempts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return attempts.filter((attempt) => {
      const matchesSearch =
        !q ||
        attempt.student?.username?.toLowerCase().includes(q) ||
        attempt.student?.email?.toLowerCase().includes(q) ||
        attempt.course?.code?.toLowerCase().includes(q) ||
        attempt.course?.title?.toLowerCase().includes(q) ||
        attempt.student?.department?.toLowerCase().includes(q);

      const score = attempt.score_percent || 0;

      const matchesScore =
        !scoreFilter ||
        (scoreFilter === "excellent" && score >= 80) ||
        (scoreFilter === "average" && score >= 50 && score < 80) ||
        (scoreFilter === "weak" && score < 50);

      return matchesSearch && matchesScore;
    });
  }, [attempts, search, scoreFilter]);

  const visibleAttempts = filteredAttempts.slice(0, visibleCount);
  const hasMore = filteredAttempts.length > visibleCount;

  const totalAttempts = attempts.length;
  const averageScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, item) => sum + (item.score_percent || 0), 0) /
            attempts.length
        )
      : 0;

  const bestScore =
    attempts.length > 0
      ? Math.max(...attempts.map((item) => item.score_percent || 0))
      : 0;

  const activeStudents = new Set(attempts.map((item) => item.user_id)).size;

  const totalAnswered = attempts.reduce(
    (sum, item) => sum + (item.correct_answers || 0) + (item.wrong_answers || 0),
    0
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Practice Analytics
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Practice Mode
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Monitor student practice attempts, scores, accuracy and review patterns.
          </p>
        </div>

        <button
          onClick={loadAttempts}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <Activity size={18} />
          Refresh Data
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Attempts"
          value={totalAttempts}
          icon={BarChart3}
          color="bg-blue-500/10 text-blue-500"
        />
        <SummaryCard
          label="Avg Score"
          value={`${averageScore}%`}
          icon={Target}
          color="bg-orange/10 text-orange"
        />
        <SummaryCard
          label="Best Score"
          value={`${bestScore}%`}
          icon={Trophy}
          color="bg-green-500/10 text-green-500"
        />
        <SummaryCard
          label="Students"
          value={activeStudents}
          icon={Users}
          color="bg-purple-500/10 text-purple-500"
        />
        <SummaryCard
          label="Answered"
          value={totalAnswered}
          icon={CheckCircle2}
          color="bg-yellow-500/10 text-yellow-500"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 lg:col-span-2">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(50);
            }}
            placeholder="Search student, course, department..."
            className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <select
          value={scoreFilter}
          onChange={(e) => {
            setScoreFilter(e.target.value);
            setVisibleCount(50);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Scores</option>
          <option value="excellent">Excellent 80%+</option>
          <option value="average">Average 50% - 79%</option>
          <option value="weak">Weak Below 50%</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-orange/10 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-col gap-2 border-b border-orange/10 bg-soft/80 px-5 py-4 dark:border-white/10 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-navy dark:text-white">
              Practice Attempts
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Showing {visibleAttempts.length} of {filteredAttempts.length} attempts.
            </p>
          </div>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">
            Live Attempts
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-2xl bg-soft dark:bg-white/10"
              />
            ))}
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
              <BarChart3 size={28} />
            </div>
            <h3 className="mt-5 text-xl font-black text-navy dark:text-white">
              No practice attempts yet
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Attempts will appear here once students start practicing.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-orange/10 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/10">
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Course</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Correct</th>
                    <th className="px-5 py-4">Wrong</th>
                    <th className="px-5 py-4">Unanswered</th>
                    <th className="px-5 py-4">Time</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleAttempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="border-b border-orange/10 transition hover:bg-soft/70 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-4">
                        <p className="font-black text-navy dark:text-white">
                          {attempt.student?.username || "Unknown Student"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                          {attempt.student?.department || "No department"} •{" "}
                          {attempt.student?.level || "No level"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-navy dark:text-white">
                          {attempt.course?.code || "No course"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                          {attempt.course?.title || "No title"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <ScoreBadge score={attempt.score_percent || 0} />
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-green-600 dark:text-green-300">
                        {attempt.correct_answers || 0}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-red-600 dark:text-red-300">
                        {attempt.wrong_answers || 0}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-500 dark:text-slate-300">
                        {attempt.unanswered || 0}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                        {formatTime(attempt.time_used_seconds || 0)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openAttempt(attempt)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
              {visibleAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-[24px] border border-orange/10 bg-soft/80 p-4 dark:border-white/10 dark:bg-slate-950/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-navy dark:text-white">
                        {attempt.student?.username || "Unknown Student"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                        {attempt.student?.department || "No department"} •{" "}
                        {attempt.student?.level || "No level"}
                      </p>
                    </div>

                    <ScoreBadge score={attempt.score_percent || 0} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniInfo
                      label="Course"
                      value={attempt.course?.code || "No course"}
                    />
                    <MiniInfo
                      label="Time"
                      value={formatTime(attempt.time_used_seconds || 0)}
                    />
                    <MiniInfo
                      label="Correct"
                      value={String(attempt.correct_answers || 0)}
                    />
                    <MiniInfo
                      label="Wrong"
                      value={String(attempt.wrong_answers || 0)}
                    />
                  </div>

                  <button
                    onClick={() => openAttempt(attempt)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange/10 px-4 py-3 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                  >
                    <Eye size={14} />
                    View Attempt
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {filteredAttempts.length > 50 && (
        <div className="mt-8 flex justify-center">
          {hasMore ? (
            <button
              onClick={() => setVisibleCount((prev) => prev + 50)}
              className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] dark:bg-white/10"
            >
              Show More Attempts
            </button>
          ) : (
            <button
              onClick={() => setVisibleCount(50)}
              className="rounded-2xl bg-white/85 px-6 py-3 text-sm font-black text-navy shadow-sm backdrop-blur-xl transition hover:scale-[1.02] dark:bg-white/10 dark:text-white"
            >
              Show Less
            </button>
          )}
        </div>
      )}

      {selectedAttempt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  Attempt Review
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  {selectedAttempt.student?.username || "Unknown Student"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  {selectedAttempt.course?.code || "Course"} • Score{" "}
                  {selectedAttempt.score_percent || 0}%
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedAttempt(null);
                  setAnswers([]);
                }}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Info
                label="Correct"
                value={String(selectedAttempt.correct_answers || 0)}
              />
              <Info
                label="Wrong"
                value={String(selectedAttempt.wrong_answers || 0)}
              />
              <Info
                label="Unanswered"
                value={String(selectedAttempt.unanswered || 0)}
              />
              <Info
                label="Time Used"
                value={formatTime(selectedAttempt.time_used_seconds || 0)}
              />
            </div>

            {answersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-3xl bg-soft dark:bg-white/10"
                  />
                ))}
              </div>
            ) : answers.length === 0 ? (
              <div className="rounded-3xl bg-soft p-8 text-center dark:bg-slate-950/50">
                <p className="font-black text-navy dark:text-white">
                  No answers found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    className="rounded-3xl border border-orange/10 bg-soft p-5 dark:border-white/10 dark:bg-slate-950/50"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-navy dark:bg-white/10 dark:text-white">
                        Question {index + 1}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          answer.is_correct
                            ? "bg-green-500/10 text-green-600 dark:text-green-300"
                            : "bg-red-500/10 text-red-600 dark:text-red-300"
                        }`}
                      >
                        {answer.is_correct ? "Correct" : "Wrong"}
                      </span>

                      {answer.confidence && (
                        <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
                          Confidence: {answer.confidence}
                        </span>
                      )}
                    </div>

                    <p className="font-black leading-7 text-navy dark:text-white">
                      {answer.question?.question || "Question not found"}
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 md:grid-cols-2">
                      <p>A. {answer.question?.option_a}</p>
                      <p>B. {answer.question?.option_b}</p>
                      <p>C. {answer.question?.option_c}</p>
                      <p>D. {answer.question?.option_d}</p>
                      {answer.question?.option_e && (
                        <p>E. {answer.question.option_e}</p>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Info
                        label="Selected"
                        value={answer.selected_answer || "Not answered"}
                      />
                      <Info
                        label="Correct"
                        value={answer.correct_answer || "Not set"}
                      />
                    </div>

                    {answer.question?.explanation && (
                      <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-white/10">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
                          Explanation
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                          {answer.question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10">
      <div
        className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl ${color}`}
      >
        <Icon size={21} />
      </div>
      <p className="text-3xl font-black text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
        {label}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        score >= 80
          ? "bg-green-500/10 text-green-600 dark:text-green-300"
          : score >= 50
          ? "bg-orange/10 text-orange"
          : "bg-red-500/10 text-red-600 dark:text-red-300"
      }`}
    >
      {score}%
    </span>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-navy dark:text-white">
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 dark:bg-white/10">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-navy dark:text-white">
        {value}
      </p>
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins <= 0) return `${secs}s`;

  return `${mins}m ${secs}s`;
}
