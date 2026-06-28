import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Edit3,
  Layers,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
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
import type { Topic } from "../services/topics";
import {
  createTopic,
  deleteTopic,
  getTopics,
  updateTopic,
} from "../services/topics";

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

const emptyTopicForm = {
  course_id: "",
  title: "",
  description: "",
  summary_1: "",
  summary_2: "",
  summary_3: "",
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

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodControl, setPeriodControl] = useState<AppPeriodControl | null>(null);

  const [context, setContext] = useState(emptyContext);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);

  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);

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

      setCourses(coursesData);
      setTopics(topicsData);
    } catch (error: any) {
      alert(error.message || "Could not load topics.");
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
    } catch (error: any) {
      alert(error.message || "Could not switch workspace period.");
    } finally {
      setSavingWorkspace(false);
    }
  }

  function openCreateTopic() {
    if (ownedCourses.length === 0) {
      alert("Create a course in this workspace first. Shared courses are view-only here.");
      return;
    }

    setEditingTopic(null);
    setTopicForm({
      ...emptyTopicForm,
      course_id: ownedCourses[0]?.id || "",
    });
    setTopicModalOpen(true);
  }

  function openEditTopic(topic: Topic) {
    const course = courseById.get(topic.course_id);

    if (course?.is_shared) {
      alert("This topic belongs to a shared course. Edit it from the original department workspace.");
      return;
    }

    setEditingTopic(topic);
    setTopicForm({
      course_id: topic.course_id || "",
      title: topic.title || "",
      description: topic.description || "",
      summary_1: topic.summary_1 || "",
      summary_2: topic.summary_2 || "",
      summary_3: topic.summary_3 || "",
    });
    setTopicModalOpen(true);
  }

  function toggleTopicSummary(id: string) {
    setExpandedTopics((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleSaveTopic() {
    if (!topicForm.course_id || !topicForm.title.trim()) {
      alert("Please select a course and enter topic title.");
      return;
    }

    const selectedCourse = courseById.get(topicForm.course_id);

    if (selectedCourse?.is_shared) {
      alert("Shared courses are view-only here. Add topics from the original department workspace.");
      return;
    }

    try {
      setSavingTopic(true);

      const payload = {
        course_id: topicForm.course_id,
        title: topicForm.title.trim(),
        description: topicForm.description.trim(),
        summary_1: topicForm.summary_1.trim(),
        summary_2: topicForm.summary_2.trim(),
        summary_3: topicForm.summary_3.trim(),
      };

      if (editingTopic) {
        await updateTopic(editingTopic.id, payload);
      } else {
        await createTopic(payload);
      }

      setTopicModalOpen(false);
      await loadPageData();
    } catch (error: any) {
      alert(error.message || "Could not save topic.");
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleDeleteTopic(topic: Topic) {
    const course = courseById.get(topic.course_id);

    if (course?.is_shared) {
      alert("This topic belongs to a shared course. Remove it from the original department workspace.");
      return;
    }

    const confirmed = confirm(
      `Delete "${topic.title}"? This may affect questions and materials under this topic.`
    );

    if (!confirmed) return;

    try {
      await deleteTopic(topic.id);
      await loadPageData();
    } catch (error: any) {
      alert(error.message || "Could not delete topic.");
    }
  }

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return topics;

    return topics.filter((topic) => {
      const course = courseById.get(topic.course_id);

      return (
        topic.title?.toLowerCase().includes(q) ||
        topic.description?.toLowerCase().includes(q) ||
        topic.summary_1?.toLowerCase().includes(q) ||
        topic.summary_2?.toLowerCase().includes(q) ||
        topic.summary_3?.toLowerCase().includes(q) ||
        topic.courses?.code?.toLowerCase().includes(q) ||
        topic.courses?.title?.toLowerCase().includes(q) ||
        course?.code?.toLowerCase().includes(q) ||
        course?.title?.toLowerCase().includes(q)
      );
    });
  }, [topics, search, courseById]);

  const visibleTopics = filteredTopics.slice(0, visibleCount);
  const hasMoreTopics = filteredTopics.length > visibleCount;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Topic Management
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Topics
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Manage topics inside the selected department workspace and academic period.
          </p>
        </div>

        <button
          onClick={openCreateTopic}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <Plus size={18} />
          Create Topic
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
              Department Topics
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Pick the department and workspace period. Topics shown here will follow the courses in that period.
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
              This controls which course topics you are managing.
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
          label="Workspace Topics"
          value={topics.length}
          icon={Layers}
          color="bg-purple-500/10 text-purple-500"
        />
        <SummaryCard
          label="Courses In Period"
          value={courses.length}
          icon={BookOpen}
          color="bg-orange/10 text-orange"
        />
        <SummaryCard
          label="Visible Results"
          value={filteredTopics.length}
          icon={Search}
          color="bg-blue-500/10 text-blue-500"
        />
      </div>

      <div className="mb-6 flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(10);
          }}
          placeholder="Search topic, course code, course title, summary..."
          className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-[28px] bg-white/70 dark:bg-white/10"
            />
          ))}
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="rounded-[28px] border border-orange/10 bg-white/85 p-10 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
            <Layers size={28} />
          </div>
          <h3 className="mt-5 text-xl font-black text-navy dark:text-white">
            No topics in this workspace yet
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Create topics under courses in {workspacePeriod?.name || "this period"}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTopics.map((topic) => {
              const isExpanded = expandedTopics.includes(topic.id);
              const summaries = [
                topic.summary_1,
                topic.summary_2,
                topic.summary_3,
              ].filter(Boolean);
              const course = courseById.get(topic.course_id);
              const isShared = Boolean(course?.is_shared);

              return (
                <div
                  key={topic.id}
                  className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">
                        {course?.code || topic.courses?.code || "Course"}
                      </p>
                      <h3 className="mt-2 text-xl font-black text-navy dark:text-white">
                        {topic.title}
                      </h3>
                    </div>

                    {isShared && (
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-300">
                        Shared
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                    {course?.title || topic.courses?.title || "No course title"}
                  </p>

                  <p className="mt-2 text-xs font-black text-orange">
                    {workspacePeriod?.name || topic.courses?.academic_periods?.name || "Period"}
                  </p>

                  <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                    {topic.description || "No description added yet."}
                  </p>

                  {summaries.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => toggleTopicSummary(topic.id)}
                        className="rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                      >
                        {isExpanded
                          ? "Hide Summaries"
                          : `View Summaries (${summaries.length})`}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {summaries.map((summary, index) => (
                            <div
                              key={index}
                              className="rounded-2xl bg-soft px-4 py-3 text-sm font-bold leading-6 text-slate-600 dark:bg-slate-950/50 dark:text-slate-200"
                            >
                              {summary}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {!isShared && (
                      <button
                        onClick={() => openEditTopic(topic)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-soft px-4 py-2 text-xs font-black text-navy transition hover:bg-orange hover:text-white dark:bg-slate-950/50 dark:text-white dark:hover:bg-orange"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                    )}

                    {!isShared && (
                      <button
                        onClick={() => handleDeleteTopic(topic)}
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

          {filteredTopics.length > 10 && (
            <div className="mt-8 flex justify-center">
              {hasMoreTopics ? (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] dark:bg-white/10"
                >
                  Show More Topics
                </button>
              ) : (
                <button
                  onClick={() => setVisibleCount(10)}
                  className="rounded-2xl bg-white/85 px-6 py-3 text-sm font-black text-navy shadow-sm backdrop-blur-xl transition hover:scale-[1.02] dark:bg-white/10 dark:text-white"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </>
      )}

      {topicModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-2xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  {editingTopic ? "Edit Topic" : "New Topic"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  {editingTopic ? "Update Topic" : "Create Topic"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Topics will be created under {workspacePeriod?.name || "the selected workspace period"}.
                </p>
              </div>

              <button
                onClick={() => setTopicModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <Select
                label="Course"
                value={topicForm.course_id}
                onChange={(value) =>
                  setTopicForm((prev) => ({ ...prev, course_id: value }))
                }
                options={ownedCourses.map((course) => ({
                  label: `${course.code} - ${course.title}`,
                  value: course.id,
                }))}
              />

              <Input
                label="Topic Title"
                value={topicForm.title}
                onChange={(value) =>
                  setTopicForm((prev) => ({ ...prev, title: value }))
                }
              />

              <Textarea
                label="Description"
                value={topicForm.description}
                onChange={(value) =>
                  setTopicForm((prev) => ({ ...prev, description: value }))
                }
              />

              <Textarea
                label="Summary 1"
                value={topicForm.summary_1}
                onChange={(value) =>
                  setTopicForm((prev) => ({ ...prev, summary_1: value }))
                }
              />

              <Textarea
                label="Summary 2"
                value={topicForm.summary_2}
                onChange={(value) =>
                  setTopicForm((prev) => ({ ...prev, summary_2: value }))
                }
              />

              <Textarea
                label="Summary 3"
                value={topicForm.summary_3}
                onChange={(value) =>
                  setTopicForm((prev) => ({ ...prev, summary_3: value }))
                }
              />

              <button
                onClick={handleSaveTopic}
                disabled={savingTopic}
                className="w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
              >
                {savingTopic
                  ? "Saving..."
                  : editingTopic
                  ? "Save Changes"
                  : "Create Topic"}
              </button>
            </div>
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

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
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

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-2xl border border-orange/10 bg-soft px-4 py-3 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
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
        {options.length === 0 && <option value="">No owned courses available</option>}

        {options.map((item) => (
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
