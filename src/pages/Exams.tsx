import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Eye,
  GraduationCap,
  Search,
  SlidersHorizontal,
  Target,
  Timer,
  Users,
  X,
} from "lucide-react";
import type { AcademicPeriod, AppPeriodControl, Course } from "../services/courses";
import {
  ensureAcademicPeriods,
  getAcademicPeriodType,
  getAppPeriodControl,
  getCourses,
  updateWorkspacePeriod,
} from "../services/courses";
import type { ExamAnswer, ExamAttempt } from "../services/exams";
import { getExamAnswers, getExamAttempts } from "../services/exams";

const LASU_DATA: Record<string, string[]> = {
  Arts: [
    "Arabic",
    "Christian Religious Studies",
    "English",
    "French",
    "History and International Studies",
    "Islamic Studies",
    "Linguistics",
    "Music",
    "Peace Studies",
    "Philosophy",
    "Portuguese / English",
    "Theatre Arts",
    "Yoruba",
  ],
  "Communication and Media Studies": ["Mass Communication"],
  Education: [
    "Arabic Education",
    "Biology Education",
    "Business Education",
    "Chemistry Education",
    "Christian Religious Studies Education",
    "Computer Science Education",
    "Early Childhood Education",
    "Economics Education",
    "Educational Management",
    "English Education",
    "French Education",
    "Geography Education",
    "Guidance and Counselling",
    "Health Education",
    "History Education",
    "Islamic Studies Education",
    "Mathematics Education",
    "Music Education",
    "Physical and Health Education",
    "Physics Education",
    "Political Science Education",
    "Social Studies and Civic Education",
    "Special Education",
    "Technology and Vocational Education",
    "Yoruba Education",
  ],
  Engineering: [
    "Aeronautic and Astronautic Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Electronics and Computer Engineering",
    "Industrial Engineering",
    "Mechanical Engineering",
  ],
  "Environmental Sciences": [
    "Architecture",
    "Building",
    "Estate Management",
    "Environmental Management",
    "Fine Arts",
    "Industrial Design",
    "Survey and Geo-Informatics",
    "Quantity Surveying",
    "Urban and Regional Planning",
  ],
  Law: ["Common/Civil Law", "Common/Islamic Law"],
  "Management Sciences": [
    "Accounting",
    "Banking and Finance",
    "Business Administration",
    "Industrial Relations and Human Resource Management",
    "Insurance",
    "Local Government Development and Administration",
    "Management Technology",
    "Marketing",
    "Public Administration",
    "Taxation",
  ],
  Science: [
    "Biochemistry",
    "Botany",
    "Chemistry",
    "Fisheries and Aquatic Biology",
    "Mathematics",
    "Microbiology",
    "Physics",
    "Science Laboratory Technology",
    "Zoology",
  ],
  "Social Sciences": [
    "Economics",
    "Geography and Planning",
    "Political Science",
    "Sociology",
    "Psychology",
  ],
  "Computing and Information Technology": [
    "Computer Science",
    "Cyber Security",
    "Data Science",
    "Information and Communication Technology",
    "Software Engineering",
  ],
  "School of Agriculture": [
    "Agricultural Economics",
    "Agricultural Extension and Rural Development",
    "Animal Science",
    "Crop Production",
  ],
  "School of Library, Archival and Information Science": [
    "Library and Information Science",
  ],
  "School of Transport and Logistics": [
    "Transport Management and Operations",
    "Logistics and Supply Chain Management",
  ],
};

const LASUCOM_DEPARTMENTS = [
  "Dentistry",
  "Medical Laboratory Science",
  "Medicine and Surgery",
  "Nursing",
  "Pharmacy",
  "Pharmacology",
  "Physiology",
  "Physiotherapy",
  "Radiography and Radiation Science",
];

const emptyContext = {
  school: "LASU",
  faculty: "",
  department: "",
  level: "100L",
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

function getContextFaculty(context: typeof emptyContext) {
  return context.school === "LASUCOM" ? "College of Medicine" : clean(context.faculty);
}

function getDepartmentOptions(school: string, faculty: string) {
  if (school === "LASUCOM") return LASUCOM_DEPARTMENTS;
  if (!faculty) return [];
  return LASU_DATA[faculty] || [];
}

function getLevelOptions(school: string, department?: string) {
  if (school !== "LASUCOM") return ["100L", "200L", "300L", "400L", "500L"];

  const periodType = getAcademicPeriodType(department);

  if (periodType === "block") return ["200L", "300L"];

  return ["200L", "300L", "400L", "500L"];
}

export default function Exams() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodControl, setPeriodControl] = useState<AppPeriodControl | null>(null);

  const [context, setContext] = useState(emptyContext);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");
  const [submitFilter, setSubmitFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const departmentOptions = getDepartmentOptions(context.school, context.faculty);
  const levelOptions = getLevelOptions(context.school, context.department);

  const workspacePeriodId = periodControl?.workspace_period_id || periods[0]?.id || "";
  const workspacePeriod = periods.find((item) => item.id === workspacePeriodId) || null;
  const periodType = getAcademicPeriodType(context.department);

  const courseById = useMemo(() => {
    return new Map(courses.map((course) => [course.id, course]));
  }, [courses]);

  useEffect(() => {
    loadAcademicWorkspace();
  }, [context.school, context.faculty, context.department, context.level]);

  useEffect(() => {
    if (workspacePeriodId) {
      loadAttempts();
    }
  }, [workspacePeriodId]);

  async function loadAcademicWorkspace() {
    const faculty = getContextFaculty(context);

    if (!context.school || !context.department || !context.level || (context.school === "LASU" && !faculty)) {
      setPeriods([]);
      setPeriodControl(null);
      setCourses([]);
      setAttempts([]);
      setLoading(false);
      return;
    }

    try {
      setLoadingPeriods(true);

      const nextPeriods = await ensureAcademicPeriods({
        school: context.school,
        faculty,
        department: context.department,
        level: context.level,
      });

      setPeriods(nextPeriods);

      const control = await getAppPeriodControl({
        school: context.school,
        faculty,
        department: context.department,
        level: context.level,
      });

      if (!control && nextPeriods[0]) {
        const created = await updateWorkspacePeriod({
          school: context.school,
          faculty,
          department: context.department,
          level: context.level,
          workspace_period_id: nextPeriods[0].id,
        });

        setPeriodControl(created);
      } else {
        setPeriodControl(control);
      }
    } catch (error: any) {
      alert(error.message || "Could not load academic workspace.");
    } finally {
      setLoadingPeriods(false);
    }
  }

  async function loadAttempts() {
    const faculty = getContextFaculty(context);

    if (!context.school || !context.department || !context.level || !workspacePeriodId) {
      setCourses([]);
      setAttempts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const coursesData = await getCourses({
        school: context.school,
        faculty,
        department: context.department,
        level: context.level,
        academic_period_id: workspacePeriodId,
      });

      const courseIds = coursesData.map((course) => course.id);
      const data = await getExamAttempts({ course_ids: courseIds });

      setCourses(coursesData);
      setAttempts(data);
    } catch (error: any) {
      alert(error.message || "Could not load exam attempts.");
    } finally {
      setLoading(false);
    }
  }

  function handleContextSchoolChange(value: string) {
    if (value === "LASUCOM") {
      setContext({
        school: "LASUCOM",
        faculty: "College of Medicine",
        department: "",
        level: "200L",
      });
      return;
    }

    setContext({
      school: "LASU",
      faculty: "",
      department: "",
      level: "100L",
    });
  }

  function handleContextFacultyChange(value: string) {
    setContext((prev) => ({
      ...prev,
      faculty: value,
      department: "",
    }));
  }

  function handleContextDepartmentChange(value: string) {
    const levels = getLevelOptions(context.school, value);

    setContext((prev) => ({
      ...prev,
      department: value,
      level: levels[0] || prev.level,
    }));
  }

  async function handleWorkspaceSwitch(periodId: string) {
    if (!periodId) return;

    const faculty = getContextFaculty(context);

    try {
      setSavingWorkspace(true);

      const updated = await updateWorkspacePeriod({
        school: context.school,
        faculty,
        department: context.department,
        level: context.level,
        workspace_period_id: periodId,
      });

      setPeriodControl((prev) => ({
        ...(prev || updated),
        ...updated,
        live_period_id: prev?.live_period_id || updated.live_period_id,
      }));

      setCourseFilter("");
      setVisibleCount(50);
    } catch (error: any) {
      alert(error.message || "Could not switch workspace period.");
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function openAttempt(attempt: ExamAttempt) {
    try {
      setSelectedAttempt(attempt);
      setAnswersLoading(true);
      const data = await getExamAnswers(attempt.id);
      setAnswers(data);
    } catch (error: any) {
      alert(error.message || "Could not load exam answers.");
    } finally {
      setAnswersLoading(false);
    }
  }

  const filteredAttempts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return attempts.filter((attempt) => {
      const course = courseById.get(attempt.course_id);
      const score = attempt.score_percent || 0;

      const matchesSearch =
        !q ||
        attempt.student?.username?.toLowerCase().includes(q) ||
        attempt.student?.email?.toLowerCase().includes(q) ||
        attempt.student?.department?.toLowerCase().includes(q) ||
        attempt.course?.code?.toLowerCase().includes(q) ||
        attempt.course?.title?.toLowerCase().includes(q) ||
        course?.code?.toLowerCase().includes(q) ||
        course?.title?.toLowerCase().includes(q);

      const matchesScore =
        !scoreFilter ||
        (scoreFilter === "excellent" && score >= 80) ||
        (scoreFilter === "average" && score >= 50 && score < 80) ||
        (scoreFilter === "weak" && score < 50);

      const submittedBy = attempt.submitted_by || "student";

      const matchesSubmit =
        !submitFilter || submittedBy.toLowerCase() === submitFilter;

      const matchesCourse = !courseFilter || attempt.course_id === courseFilter;

      return matchesSearch && matchesScore && matchesSubmit && matchesCourse;
    });
  }, [attempts, search, scoreFilter, submitFilter, courseFilter, courseById]);

  const visibleAttempts = filteredAttempts.slice(0, visibleCount);
  const hasMore = filteredAttempts.length > visibleCount;

  const totalAttempts = filteredAttempts.length;

  const averageScore =
    filteredAttempts.length > 0
      ? Math.round(
          filteredAttempts.reduce((sum, item) => sum + (item.score_percent || 0), 0) /
            filteredAttempts.length
        )
      : 0;

  const bestScore =
    filteredAttempts.length > 0
      ? Math.max(...filteredAttempts.map((item) => item.score_percent || 0))
      : 0;

  const activeStudents = new Set(filteredAttempts.map((item) => item.user_id)).size;

  const autoSubmitted = filteredAttempts.filter(
    (item) => item.submitted_by?.toLowerCase() === "system"
  ).length;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Exam Analytics
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Exam Mode
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Monitor CBT attempts for the selected department and academic period.
          </p>
        </div>

        <button
          onClick={loadAttempts}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <Activity size={18} />
          Refresh Exams
        </button>
      </div>

      <div className="mb-6 rounded-[32px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-orange">
              <SlidersHorizontal size={14} />
              Workspace Filter
            </div>
            <h2 className="mt-3 text-2xl font-black text-navy dark:text-white">
              Exam Workspace
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Analytics here follow the selected department, level and workspace period.
            </p>
          </div>

          <div className="rounded-3xl bg-soft p-4 dark:bg-slate-950/40">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Structure
            </p>
            <p className="mt-2 text-lg font-black text-navy dark:text-white">
              {periodType === "block" ? "Block System" : "Semester System"}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">
              {workspacePeriod?.name || "Select workspace"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectRaw
            label="School"
            value={context.school}
            onChange={handleContextSchoolChange}
            options={["LASU", "LASUCOM"]}
          />

          {context.school === "LASU" && (
            <SelectRaw
              label="Faculty"
              value={context.faculty}
              onChange={handleContextFacultyChange}
              options={["", ...Object.keys(LASU_DATA)]}
            />
          )}

          <SelectRaw
            label="Department"
            value={context.department}
            onChange={handleContextDepartmentChange}
            options={["", ...departmentOptions]}
          />

          <SelectRaw
            label="Level"
            value={context.level}
            onChange={(value: string) =>
              setContext((prev) => ({ ...prev, level: value }))
            }
            options={levelOptions}
          />
        </div>

        <div className="mt-5 rounded-[28px] border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/40">
          <div className="mb-3">
            <h3 className="text-sm font-black text-navy dark:text-white">
              Workspace Period
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
              This controls which exam attempts you are viewing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {periods.map((period) => (
              <button
                key={period.id}
                onClick={() => handleWorkspaceSwitch(period.id)}
                disabled={loadingPeriods || savingWorkspace}
                className={`rounded-2xl border px-4 py-2 text-xs font-black transition ${
                  workspacePeriodId === period.id
                    ? "border-orange bg-orange text-white shadow-lg shadow-orange-500/20"
                    : "border-orange/10 bg-white/70 text-navy hover:border-orange hover:text-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
                }`}
              >
                {period.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Exam Attempts"
          value={totalAttempts}
          icon={GraduationCap}
          color="bg-blue-500/10 text-blue-500"
        />
        <SummaryCard
          label="Average Score"
          value={`${averageScore}%`}
          icon={Target}
          color="bg-orange/10 text-orange"
        />
        <SummaryCard
          label="Best Score"
          value={`${bestScore}%`}
          icon={Award}
          color="bg-green-500/10 text-green-500"
        />
        <SummaryCard
          label="Students"
          value={activeStudents}
          icon={Users}
          color="bg-purple-500/10 text-purple-500"
        />
        <SummaryCard
          label="Auto Submitted"
          value={autoSubmitted}
          icon={Timer}
          color="bg-red-500/10 text-red-500"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-5">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 xl:col-span-2">
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
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setVisibleCount(50);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Courses</option>
          {courses.map((course) => (
            <option key={`${course.id}-${course.is_shared ? "shared" : "owned"}`} value={course.id}>
              {course.code} - {course.title}{course.is_shared ? " (Shared)" : ""}
            </option>
          ))}
        </select>

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

        <select
          value={submitFilter}
          onChange={(e) => {
            setSubmitFilter(e.target.value);
            setVisibleCount(50);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Submissions</option>
          <option value="student">Student Submitted</option>
          <option value="system">Auto Submitted</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-orange/10 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-col gap-2 border-b border-orange/10 bg-soft/80 px-5 py-4 dark:border-white/10 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-navy dark:text-white">
              Exam Attempts
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Showing {visibleAttempts.length} of {filteredAttempts.length} exam attempts.
            </p>
          </div>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">
            {workspacePeriod?.name || "CBT Monitoring"}
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
              No exam attempts in this workspace yet
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Exam records will appear once students attempt courses in this period.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-orange/10 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/10">
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Course</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Correct</th>
                    <th className="px-5 py-4">Wrong</th>
                    <th className="px-5 py-4">Unanswered</th>
                    <th className="px-5 py-4">Time</th>
                    <th className="px-5 py-4">Submitted</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleAttempts.map((attempt) => {
                    const course = courseById.get(attempt.course_id);

                    return (
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
                            {course?.code || attempt.course?.code || "No course"}
                            {course?.is_shared ? " • Shared" : ""}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                            {course?.title || attempt.course?.title || "No title"}
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

                        <td className="px-5 py-4">
                          <SubmissionBadge submittedBy={attempt.submitted_by || "student"} />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openAttempt(attempt)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                          >
                            <Eye size={14} />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
              {visibleAttempts.map((attempt) => {
                const course = courseById.get(attempt.course_id);

                return (
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
                        value={`${course?.code || attempt.course?.code || "No course"}${course?.is_shared ? " Shared" : ""}`}
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

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <SubmissionBadge submittedBy={attempt.submitted_by || "student"} />

                      <button
                        onClick={() => openAttempt(attempt)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange/10 px-4 py-3 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                      >
                        <Eye size={14} />
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
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
              Show More Exam Attempts
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
                  Exam Review
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

                      {answer.is_flagged && (
                        <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
                          Flagged
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

function SubmissionBadge({ submittedBy }: { submittedBy: string }) {
  const isSystem = submittedBy.toLowerCase() === "system";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        isSystem
          ? "bg-red-500/10 text-red-600 dark:text-red-300"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
      }`}
    >
      {isSystem ? "Auto Submitted" : "Student Submitted"}
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

function SelectRaw({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      >
        {options.map((item) => (
          <option key={item || "placeholder"} value={item}>
            {item || `Select ${label}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins <= 0) return `${secs}s`;

  return `${mins}m ${secs}s`;
}
