import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileUp,
  HelpCircle,
  ListChecks,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useAdminAuth } from "../context/AuthContext";
import { createAdminLog } from "../services/adminLogs";
import type { AcademicPeriod, AppPeriodControl, Course } from "../services/courses";
import {
  ensureAcademicPeriods,
  getAcademicPeriodType,
  getAppPeriodControl,
  getCourses,
  updateWorkspacePeriod,
} from "../services/courses";
import type { Topic } from "../services/topics";
import { getTopics } from "../services/topics";
import type { Question } from "../services/questions";
import {
  bulkCreateQuestions,
  createQuestion,
  deleteQuestion,
  getQuestions,
  updateQuestion,
} from "../services/questions";

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

const emptyQuestionForm = {
  course_id: "",
  topic_id: "",
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  option_e: "",
  correct_answer: "A",
  explanation: "",
};

type BulkRow = {
  course_code: string;
  topic_title: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
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

export default function Questions() {
  const { profile } = useAdminAuth();
  const isSuperAdmin = profile?.role === "super_admin";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodControl, setPeriodControl] = useState<AppPeriodControl | null>(null);

  const [context, setContext] = useState(emptyContext);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [importing, setImporting] = useState(false);

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkError, setBulkError] = useState("");

  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);

  const facultyOptions = Object.keys(LASU_DATA);
  const departmentOptions = getDepartmentOptions(context.school, context.faculty);
  const levelOptions = getLevelOptions(context.school, context.department);

  const workspacePeriodId = periodControl?.workspace_period_id || periods[0]?.id || "";
  const workspacePeriod = periods.find((item) => item.id === workspacePeriodId) || null;
  const periodType = getAcademicPeriodType(context.department);

  const ownedCourses = courses.filter((course) => !course.is_shared);
  const courseById = useMemo(() => {
    return new Map(courses.map((course) => [course.id, course]));
  }, [courses]);

  const filteredTopicsForForm = useMemo(() => {
    if (!questionForm.course_id) return [];
    return topics.filter((topic) => topic.course_id === questionForm.course_id);
  }, [topics, questionForm.course_id]);

  const filteredTopicsForFilter = useMemo(() => {
    if (!courseFilter) return topics;
    return topics.filter((topic) => topic.course_id === courseFilter);
  }, [topics, courseFilter]);

  useEffect(() => {
    loadAcademicWorkspace();
  }, [context.school, context.faculty, context.department, context.level]);

  useEffect(() => {
    if (workspacePeriodId) {
      loadPageData();
    }
  }, [workspacePeriodId]);

  async function loadAcademicWorkspace() {
    const faculty = getContextFaculty(context);

    if (!context.school || !context.department || !context.level || (context.school === "LASU" && !faculty)) {
      setPeriods([]);
      setPeriodControl(null);
      setCourses([]);
      setTopics([]);
      setQuestions([]);
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

  async function loadPageData() {
    const faculty = getContextFaculty(context);

    if (!context.school || !context.department || !context.level || !workspacePeriodId) {
      setCourses([]);
      setTopics([]);
      setQuestions([]);
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
      const topicsData = await getTopics({ course_ids: courseIds });
      const topicIds = topicsData.map((topic) => topic.id);
      const questionsData = await getQuestions({
        course_ids: courseIds,
        topic_ids: topicIds,
      });

      setCourses(coursesData);
      setTopics(topicsData);
      setQuestions(questionsData);
    } catch (error: any) {
      alert(error.message || "Could not load questions.");
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
      setTopicFilter("");
      setVisibleCount(20);
    } catch (error: any) {
      alert(error.message || "Could not switch workspace period.");
    } finally {
      setSavingWorkspace(false);
    }
  }

  function normalizeCode(value: string) {
    return value.replace(/\s+/g, "").trim().toLowerCase();
  }

  function toggleQuestion(id: string) {
    setExpandedQuestions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function openCreateQuestion() {
    if (ownedCourses.length === 0) {
      alert("Create a course in this workspace first. Shared courses are view-only here.");
      return;
    }

    const firstCourse = ownedCourses[0]?.id || "";
    const firstTopic = topics.find((topic) => topic.course_id === firstCourse);

    if (!firstTopic) {
      alert("Create a topic under an owned course first.");
      return;
    }

    setEditingQuestion(null);
    setQuestionForm({
      ...emptyQuestionForm,
      course_id: firstCourse,
      topic_id: firstTopic?.id || "",
    });
    setQuestionModalOpen(true);
  }

  function openEditQuestion(item: Question) {
    const course = courseById.get(item.course_id);

    if (course?.is_shared) {
      alert("This question belongs to a shared course. Edit it from the original department workspace.");
      return;
    }

    setEditingQuestion(item);
    setQuestionForm({
      course_id: item.course_id || "",
      topic_id: item.topic_id || "",
      question: item.question || "",
      option_a: item.option_a || "",
      option_b: item.option_b || "",
      option_c: item.option_c || "",
      option_d: item.option_d || "",
      option_e: item.option_e || "",
      correct_answer: item.correct_answer || "A",
      explanation: item.explanation || "",
    });
    setQuestionModalOpen(true);
  }

  function handleCourseChange(value: string) {
    const firstTopic = topics.find((topic) => topic.course_id === value);

    setQuestionForm((prev) => ({
      ...prev,
      course_id: value,
      topic_id: firstTopic?.id || "",
    }));
  }

  async function handleSaveQuestion() {
    if (
      !questionForm.course_id ||
      !questionForm.topic_id ||
      !questionForm.question.trim() ||
      !questionForm.option_a.trim() ||
      !questionForm.option_b.trim() ||
      !questionForm.option_c.trim() ||
      !questionForm.option_d.trim() ||
      !questionForm.correct_answer.trim()
    ) {
      alert("Please fill the course, topic, question, options A-D and correct answer.");
      return;
    }

    const selectedCourse = courseById.get(questionForm.course_id);

    if (selectedCourse?.is_shared) {
      alert("Shared courses are view-only here. Add questions from the original department workspace.");
      return;
    }

    try {
      setSavingQuestion(true);

      const payload = {
        course_id: questionForm.course_id,
        topic_id: questionForm.topic_id,
        question: questionForm.question.trim(),
        option_a: questionForm.option_a.trim(),
        option_b: questionForm.option_b.trim(),
        option_c: questionForm.option_c.trim(),
        option_d: questionForm.option_d.trim(),
        option_e: questionForm.option_e.trim(),
        correct_answer: questionForm.correct_answer.trim().toUpperCase(),
        explanation: questionForm.explanation.trim(),
      };

      if (editingQuestion) {
        const updated = await updateQuestion(editingQuestion.id, payload);

        await createAdminLog({
          admin_id: profile?.id,
          action: "UPDATE_QUESTION",
          target_table: "questions",
          target_id: updated.id,
          description: `Updated question under ${updated.courses?.code || "course"}`,
        });
      } else {
        const created = await createQuestion(payload);

        await createAdminLog({
          admin_id: profile?.id,
          action: "CREATE_QUESTION",
          target_table: "questions",
          target_id: created.id,
          description: `Created question under ${created.courses?.code || "course"}`,
        });
      }

      setQuestionModalOpen(false);
      await loadPageData();
    } catch (error: any) {
      alert(error.message || "Could not save question.");
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(item: Question) {
    if (!isSuperAdmin) {
      alert("Only super admins can delete questions.");
      return;
    }

    const course = courseById.get(item.course_id);

    if (course?.is_shared) {
      alert("This question belongs to a shared course. Delete it from the original department workspace.");
      return;
    }

    const confirmed = confirm("Delete this question?");

    if (!confirmed) return;

    try {
      await deleteQuestion(item.id);

      await createAdminLog({
        admin_id: profile?.id,
        action: "DELETE_QUESTION",
        target_table: "questions",
        target_id: item.id,
        description: `Deleted question under ${item.courses?.code || "course"}`,
      });

      await loadPageData();
    } catch (error: any) {
      alert(error.message || "Could not delete question.");
    }
  }

  function downloadTemplate() {
    const headers = [
      "course_code",
      "topic_title",
      "question",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "option_e",
      "correct_answer",
      "explanation",
    ];

    const sample = [
      ownedCourses[0]?.code || "PST 202",
      topics.find((topic) => topic.course_id === ownedCourses[0]?.id)?.title || "Basics Of Electricity",
      "What is electric current?",
      "Flow of electric charge",
      "Flow of heat",
      "Flow of light",
      "Flow of sound",
      "",
      "A",
      "Electric current is the rate of flow of electric charge.",
    ];

    const csv = `${headers.join(",")}\n${sample
      .map((item) => `"${item}"`)
      .join(",")}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "lasu-scholar-question-template.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function parseCSVLine(line: string) {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());

    return result;
  }

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error("CSV must contain a header row and at least one question.");
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.trim());

    const requiredHeaders = [
      "course_code",
      "topic_title",
      "question",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "option_e",
      "correct_answer",
      "explanation",
    ];

    const missing = requiredHeaders.filter((header) => !headers.includes(header));

    if (missing.length > 0) {
      throw new Error(`Missing columns: ${missing.join(", ")}`);
    }

    return lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      return row as BulkRow;
    });
  }

  async function handleBulkFile(file: File) {
    try {
      setBulkError("");
      const text = await file.text();
      const rows = parseCSV(text);
      setBulkRows(rows);
    } catch (error: any) {
      setBulkError(error.message || "Could not read CSV file.");
      setBulkRows([]);
    }
  }

  async function handleBulkImport() {
    if (bulkRows.length === 0) return;

    try {
      setImporting(true);

      const rowsToInsert = bulkRows.map((row, index) => {
        const course = ownedCourses.find(
          (item) => normalizeCode(item.code) === normalizeCode(row.course_code)
        );

        if (!course) {
          throw new Error(
            `Row ${index + 2}: Course code "${row.course_code}" not found in this workspace, or it is a shared course.`
          );
        }

        const topic = topics.find(
          (item) =>
            item.course_id === course.id &&
            item.title.trim().toLowerCase() === row.topic_title.trim().toLowerCase()
        );

        if (!topic) {
          throw new Error(
            `Row ${index + 2}: Topic "${row.topic_title}" not found under ${row.course_code} in this workspace.`
          );
        }

        if (
          !row.question ||
          !row.option_a ||
          !row.option_b ||
          !row.option_c ||
          !row.option_d ||
          !row.correct_answer
        ) {
          throw new Error(
            `Row ${index + 2}: Question, options A-D and correct answer are required.`
          );
        }

        return {
          course_id: course.id,
          topic_id: topic.id,
          question: row.question,
          option_a: row.option_a,
          option_b: row.option_b,
          option_c: row.option_c,
          option_d: row.option_d,
          option_e: row.option_e || "",
          correct_answer: row.correct_answer.toUpperCase(),
          explanation: row.explanation || "",
        };
      });

      const createdQuestions = await bulkCreateQuestions(rowsToInsert);

      await createAdminLog({
        admin_id: profile?.id,
        action: "BULK_CREATE_QUESTIONS",
        target_table: "questions",
        target_id: createdQuestions?.[0]?.id || "bulk-import",
        description: `Bulk uploaded ${createdQuestions.length} question(s)`,
      });

      setBulkModalOpen(false);
      setBulkRows([]);
      await loadPageData();
    } catch (error: any) {
      setBulkError(error.message || "Bulk import failed.");
    } finally {
      setImporting(false);
    }
  }

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return questions.filter((item) => {
      const course = courseById.get(item.course_id);

      const matchesSearch =
        !q ||
        item.question?.toLowerCase().includes(q) ||
        item.option_a?.toLowerCase().includes(q) ||
        item.option_b?.toLowerCase().includes(q) ||
        item.option_c?.toLowerCase().includes(q) ||
        item.option_d?.toLowerCase().includes(q) ||
        item.option_e?.toLowerCase().includes(q) ||
        item.explanation?.toLowerCase().includes(q) ||
        item.courses?.code?.toLowerCase().includes(q) ||
        item.topics?.title?.toLowerCase().includes(q) ||
        course?.code?.toLowerCase().includes(q) ||
        course?.title?.toLowerCase().includes(q);

      const matchesCourse = !courseFilter || item.course_id === courseFilter;
      const matchesTopic = !topicFilter || item.topic_id === topicFilter;

      return matchesSearch && matchesCourse && matchesTopic;
    });
  }, [questions, search, courseFilter, topicFilter, courseById]);

  const visibleQuestions = filteredQuestions.slice(0, visibleCount);
  const hasMoreQuestions = filteredQuestions.length > visibleCount;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Question Bank
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Questions
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Add questions inside the selected department workspace and academic period.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
          >
            <FileUp size={18} />
            Bulk Upload
          </button>

          <button
            onClick={openCreateQuestion}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
          >
            <Plus size={18} />
            Add Question
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-[32px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-orange">
              <SlidersHorizontal size={14} />
              Workspace Filter
            </div>
            <h2 className="mt-3 text-2xl font-black text-navy dark:text-white">
              Department Questions
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Pick the department and workspace period. Questions shown here follow the courses and topics in that period.
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
              options={["", ...facultyOptions]}
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
              This controls which questions you are managing.
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Workspace Questions"
          value={questions.length}
          icon={ListChecks}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          label="Courses In Period"
          value={courses.length}
          icon={HelpCircle}
          color="bg-orange-50 text-orange-600"
        />
        <SummaryCard
          label="Visible Results"
          value={filteredQuestions.length}
          icon={Search}
          color="bg-blue-50 text-blue-600"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(20);
            }}
            placeholder="Search question, course, topic..."
            className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setTopicFilter("");
            setVisibleCount(20);
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
          value={topicFilter}
          onChange={(e) => {
            setTopicFilter(e.target.value);
            setVisibleCount(20);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Topics</option>
          {filteredTopicsForFilter.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-[26px] bg-white/70 dark:bg-white/10" />
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="rounded-[28px] border border-orange/10 bg-white/85 p-10 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
            <ListChecks size={28} />
          </div>
          <h3 className="mt-5 text-xl font-black text-navy dark:text-white">No questions in this workspace yet</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Add questions under courses and topics in {workspacePeriod?.name || "this period"}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleQuestions.map((item) => {
              const isExpanded = expandedQuestions.includes(item.id);
              const course = courseById.get(item.course_id);
              const isShared = Boolean(course?.is_shared);

              return (
                <div
                  key={item.id}
                  className="rounded-[26px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
                      {course?.code || item.courses?.code || "Course"}
                    </span>
                    <span className="rounded-full bg-soft px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
                      {item.topics?.title || "Topic"}
                    </span>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-600 dark:bg-green-500/10 dark:text-green-300">
                      Answer: {item.correct_answer}
                    </span>
                    {isShared && (
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-300">
                        Shared
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-3 text-base font-black leading-6 text-navy dark:text-white">
                    {item.question}
                  </h3>

                  <button
                    onClick={() => toggleQuestion(item.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange"
                  >
                    {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>

                  {isExpanded && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                        <p>A. {item.option_a}</p>
                        <p>B. {item.option_b}</p>
                        <p>C. {item.option_c}</p>
                        <p>D. {item.option_d}</p>
                        {item.option_e && <p>E. {item.option_e}</p>}
                      </div>

                      {isShared && (
                        <p className="mt-4 text-xs font-black text-blue-600 dark:text-blue-300">
                          Original department: {course?.source_department || "Not set"}
                        </p>
                      )}

                      {item.explanation && (
                        <div className="mt-4 rounded-2xl bg-soft p-4 dark:bg-slate-950/50">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
                            Explanation
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                            {item.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {!isShared && (
                      <button
                        onClick={() => openEditQuestion(item)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-soft px-4 py-2 text-xs font-black text-navy transition hover:bg-orange hover:text-white dark:bg-slate-950/50 dark:text-white dark:hover:bg-orange"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                    )}

                    {isSuperAdmin && !isShared && (
                      <button
                        onClick={() => handleDeleteQuestion(item)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-600"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}

                    {isShared && (
                      <span className="rounded-2xl bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-600 dark:text-blue-300">
                        View-only from original department
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredQuestions.length > 20 && (
            <div className="mt-8 flex justify-center">
              {hasMoreQuestions ? (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 20)}
                  className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] dark:bg-white/10"
                >
                  Show More Questions
                </button>
              ) : (
                <button
                  onClick={() => setVisibleCount(20)}
                  className="rounded-2xl bg-white/85 px-6 py-3 text-sm font-black text-navy shadow-sm backdrop-blur-xl transition hover:scale-[1.02] dark:bg-white/10 dark:text-white"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </>
      )}

      {questionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-3xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  {editingQuestion ? "Edit Question" : "New Question"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  {editingQuestion ? "Update Question" : "Add Question"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Questions will be saved under {workspacePeriod?.name || "the selected workspace period"}.
                </p>
              </div>

              <button
                onClick={() => setQuestionModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Course"
                value={questionForm.course_id}
                onChange={handleCourseChange}
                options={ownedCourses.map((course) => ({
                  label: `${course.code} - ${course.title}`,
                  value: course.id,
                }))}
              />

              <Select
                label="Topic"
                value={questionForm.topic_id}
                onChange={(value: string) =>
                  setQuestionForm((prev) => ({ ...prev, topic_id: value }))
                }
                options={filteredTopicsForForm.map((topic) => ({
                  label: topic.title,
                  value: topic.id,
                }))}
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Question"
                value={questionForm.question}
                onChange={(value: string) =>
                  setQuestionForm((prev) => ({ ...prev, question: value }))
                }
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["option_a", "option_b", "option_c", "option_d", "option_e"] as const).map(
                (key) => (
                  <Input
                    key={key}
                    label={key.replace("_", " ").toUpperCase()}
                    value={questionForm[key]}
                    onChange={(value: string) =>
                      setQuestionForm((prev) => ({ ...prev, [key]: value }))
                    }
                  />
                )
              )}

              <Select
                label="Correct Answer"
                value={questionForm.correct_answer}
                onChange={(value: string) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    correct_answer: value,
                  }))
                }
                options={["A", "B", "C", "D", "E"].map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Explanation"
                value={questionForm.explanation}
                onChange={(value: string) =>
                  setQuestionForm((prev) => ({ ...prev, explanation: value }))
                }
              />
            </div>

            <button
              onClick={handleSaveQuestion}
              disabled={savingQuestion}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {savingQuestion
                ? "Saving..."
                : editingQuestion
                ? "Save Changes"
                : "Save Question"}
            </button>
          </div>
        </div>
      )}

      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  Bulk Upload
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  Import Questions
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  This import only accepts owned courses inside the current workspace period.
                </p>
              </div>

              <button
                onClick={() => setBulkModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-black text-white"
              >
                <Download size={18} />
                Download Template
              </button>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white">
                <FileUp size={18} />
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkFile(file);
                  }}
                />
              </label>
            </div>

            {bulkError && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                {bulkError}
              </div>
            )}

            <div className="mt-6 rounded-[24px] border border-orange/10 bg-soft p-4 dark:bg-slate-950/50">
              <p className="font-black text-navy dark:text-white">
                Preview: {bulkRows.length} question(s)
              </p>

              <div className="mt-4 max-h-80 overflow-auto">
                {bulkRows.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                    No CSV uploaded yet.
                  </p>
                ) : (
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                        <th className="p-3">Course</th>
                        <th className="p-3">Topic</th>
                        <th className="p-3">Question</th>
                        <th className="p-3">Answer</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bulkRows.map((row, index) => (
                        <tr key={index} className="border-t border-orange/10">
                          <td className="p-3 font-bold text-navy dark:text-white">
                            {row.course_code}
                          </td>
                          <td className="p-3 font-bold text-navy dark:text-white">
                            {row.topic_title}
                          </td>
                          <td className="p-3 font-semibold text-slate-600 dark:text-slate-200">
                            {row.question}
                          </td>
                          <td className="p-3 font-black text-orange">
                            {row.correct_answer}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <button
              onClick={handleBulkImport}
              disabled={importing || bulkRows.length === 0}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import Questions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-[26px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10">
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl ${color}`}>
        <Icon size={21} />
      </div>
      <p className="text-3xl font-black text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}

function Input({ label, value, onChange }: any) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: any) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-orange/10 bg-soft px-4 py-3 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: any) {
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
        {options.length === 0 && <option value="">No option available</option>}

        {options.map((item: any) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
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
