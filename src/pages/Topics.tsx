import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Edit3,
  Layers,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Course } from "../services/courses";
import { getCourses } from "../services/courses";
import type { Topic } from "../services/topics";
import {
  createTopic,
  deleteTopic,
  getTopics,
  updateTopic,
} from "../services/topics";

const emptyTopicForm = {
  course_id: "",
  title: "",
  description: "",
  summary_1: "",
  summary_2: "",
  summary_3: "",
};

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTopic, setSavingTopic] = useState(false);

  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);

  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    try {
      setLoading(true);

      const [topicsData, coursesData] = await Promise.all([
        getTopics(),
        getCourses(),
      ]);

      setTopics(topicsData);
      setCourses(coursesData);
    } catch (error: any) {
      alert(error.message || "Could not load topics.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateTopic() {
    setEditingTopic(null);
    setTopicForm({
      ...emptyTopicForm,
      course_id: courses[0]?.id || "",
    });
    setTopicModalOpen(true);
  }

  function openEditTopic(topic: Topic) {
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
      return (
        topic.title?.toLowerCase().includes(q) ||
        topic.description?.toLowerCase().includes(q) ||
        topic.summary_1?.toLowerCase().includes(q) ||
        topic.summary_2?.toLowerCase().includes(q) ||
        topic.summary_3?.toLowerCase().includes(q) ||
        topic.courses?.code?.toLowerCase().includes(q) ||
        topic.courses?.title?.toLowerCase().includes(q)
      );
    });
  }, [topics, search]);

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
            Organize each course into clear study sections and add quick summaries for the student app.
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Topics"
          value={topics.length}
          icon={Layers}
          color="bg-purple-500/10 text-purple-500"
        />
        <SummaryCard
          label="Courses"
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
            No topics yet
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Create topics under courses before adding questions and materials.
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

              return (
                <div
                  key={topic.id}
                  className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">
                    {topic.courses?.code || "Course"}
                  </p>

                  <h3 className="mt-2 text-xl font-black text-navy dark:text-white">
                    {topic.title}
                  </h3>

                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                    {topic.courses?.title || "No course title"}
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
                    <button
                      onClick={() => openEditTopic(topic)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-soft px-4 py-2 text-xs font-black text-navy transition hover:bg-orange hover:text-white dark:bg-slate-950/50 dark:text-white dark:hover:bg-orange"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteTopic(topic)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
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
                options={courses.map((course) => ({
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
        {options.length === 0 && <option value="">No courses available</option>}

        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
