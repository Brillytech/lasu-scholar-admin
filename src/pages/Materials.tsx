import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  FileText,
  LinkIcon,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useAdminAuth } from "../context/AuthContext";
import { createAdminLog } from "../services/adminLogs";
import type { Course } from "../services/courses";
import { getCourses } from "../services/courses";
import type { Topic } from "../services/topics";
import { getTopics } from "../services/topics";
import type { Material, MaterialType } from "../services/materials";
import {
  createMaterial,
  deleteMaterial,
  getMaterials,
  updateMaterial,
} from "../services/materials";

const emptyMaterialForm = {
  course_id: "",
  topic_id: "",
  title: "",
  type: "PDF",
  file_url: "",
  content: "",
  video_url: "",
  thumbnail_url: "",
};

export default function Materials() {
  const { profile } = useAdminAuth();
  const isSuperAdmin = profile?.role === "super_admin";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [expandedMaterials, setExpandedMaterials] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    try {
      setLoading(true);

      const [materialsData, coursesData, topicsData] = await Promise.all([
        getMaterials(),
        getCourses(),
        getTopics(),
      ]);

      setMaterials(materialsData);
      setCourses(coursesData);
      setTopics(topicsData);
    } catch (error: any) {
      alert(error.message || "Could not load materials.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMaterial(id: string) {
    setExpandedMaterials((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  const filteredTopicsForForm = useMemo(() => {
    if (!materialForm.course_id) return [];
    return topics.filter((topic) => topic.course_id === materialForm.course_id);
  }, [topics, materialForm.course_id]);

  const filteredTopicsForFilter = useMemo(() => {
    if (!courseFilter) return topics;
    return topics.filter((topic) => topic.course_id === courseFilter);
  }, [topics, courseFilter]);

  function openCreateMaterial() {
    const firstCourse = courses[0]?.id || "";
    const firstTopic = topics.find((topic) => topic.course_id === firstCourse);

    setEditingMaterial(null);
    setMaterialForm({
      ...emptyMaterialForm,
      course_id: firstCourse,
      topic_id: firstTopic?.id || "",
    });
    setMaterialModalOpen(true);
  }

  function openEditMaterial(material: Material) {
    setEditingMaterial(material);
    setMaterialForm({
      course_id: material.course_id || "",
      topic_id: material.topic_id || "",
      title: material.title || "",
      type: material.type || "PDF",
      file_url: material.file_url || "",
      content: material.content || "",
      video_url: material.video_url || "",
      thumbnail_url: material.thumbnail_url || "",
    });
    setMaterialModalOpen(true);
  }

  function handleCourseChange(value: string) {
    const firstTopic = topics.find((topic) => topic.course_id === value);

    setMaterialForm((prev) => ({
      ...prev,
      course_id: value,
      topic_id: firstTopic?.id || "",
    }));
  }

  async function handleSaveMaterial() {
    if (
      !materialForm.course_id ||
      !materialForm.topic_id ||
      !materialForm.title.trim()
    ) {
      alert("Please select course, topic and enter material title.");
      return;
    }

    try {
      setSavingMaterial(true);

      const payload = {
        course_id: materialForm.course_id,
        topic_id: materialForm.topic_id,
        title: materialForm.title.trim(),
        type: materialForm.type as MaterialType,
        file_url: materialForm.file_url.trim(),
        content: materialForm.content.trim(),
        video_url: materialForm.video_url.trim(),
        thumbnail_url: materialForm.thumbnail_url.trim(),
      };

      if (editingMaterial) {
        const updated = await updateMaterial(editingMaterial.id, payload);

        await createAdminLog({
          admin_id: profile?.id,
          action: "UPDATE_MATERIAL",
          target_table: "materials",
          target_id: updated.id,
          description: `Updated material ${updated.title}`,
        });
      } else {
        const created = await createMaterial(payload);

        await createAdminLog({
          admin_id: profile?.id,
          action: "CREATE_MATERIAL",
          target_table: "materials",
          target_id: created.id,
          description: `Created material ${created.title}`,
        });
      }

      setMaterialModalOpen(false);
      await loadPageData();
    } catch (error: any) {
      alert(error.message || "Could not save material.");
    } finally {
      setSavingMaterial(false);
    }
  }

  async function handleDeleteMaterial(material: Material) {
    if (!isSuperAdmin) {
      alert("Only super admins can delete materials.");
      return;
    }

    const confirmed = confirm(`Delete "${material.title}"?`);

    if (!confirmed) return;

    try {
      await deleteMaterial(material.id);

      await createAdminLog({
        admin_id: profile?.id,
        action: "DELETE_MATERIAL",
        target_table: "materials",
        target_id: material.id,
        description: `Deleted material ${material.title}`,
      });

      await loadPageData();
    } catch (error: any) {
      alert(error.message || "Could not delete material.");
    }
  }

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesSearch =
        !q ||
        material.title?.toLowerCase().includes(q) ||
        material.type?.toLowerCase().includes(q) ||
        material.content?.toLowerCase().includes(q) ||
        material.courses?.code?.toLowerCase().includes(q) ||
        material.courses?.title?.toLowerCase().includes(q) ||
        material.topics?.title?.toLowerCase().includes(q);

      const matchesCourse = !courseFilter || material.course_id === courseFilter;
      const matchesTopic = !topicFilter || material.topic_id === topicFilter;

      return matchesSearch && matchesCourse && matchesTopic;
    });
  }, [materials, search, courseFilter, topicFilter]);

  const visibleMaterials = filteredMaterials.slice(0, visibleCount);
  const hasMoreMaterials = filteredMaterials.length > visibleCount;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Study Materials
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Materials
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Add PDFs, videos, links and notes for each course topic.
          </p>
        </div>

        <button
          onClick={openCreateMaterial}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <Plus size={18} />
          Add Material
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Materials"
          value={materials.length}
          icon={FileText}
          color="bg-orange/10 text-orange"
        />
        <SummaryCard
          label="Courses"
          value={courses.length}
          icon={LinkIcon}
          color="bg-blue-500/10 text-blue-500"
        />
        <SummaryCard
          label="Visible Results"
          value={filteredMaterials.length}
          icon={Search}
          color="bg-green-500/10 text-green-500"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(10);
            }}
            placeholder="Search material, course, topic..."
            className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setTopicFilter("");
            setVisibleCount(10);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.title}
            </option>
          ))}
        </select>

        <select
          value={topicFilter}
          onChange={(e) => {
            setTopicFilter(e.target.value);
            setVisibleCount(10);
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
            <div
              key={item}
              className="h-44 animate-pulse rounded-[28px] bg-white/70 dark:bg-white/10"
            />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="rounded-[28px] border border-orange/10 bg-white/85 p-10 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
            <FileText size={28} />
          </div>
          <h3 className="mt-5 text-xl font-black text-navy dark:text-white">
            No materials yet
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Add the first PDF, note, video or link for your students.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleMaterials.map((material) => {
              const isExpanded = expandedMaterials.includes(material.id);

              return (
                <div
                  key={material.id}
                  className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
                      {material.courses?.code || "Course"}
                    </span>

                    <span className="rounded-full bg-soft px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
                      {material.topics?.title || "Topic"}
                    </span>

                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-600 dark:text-green-300">
                      {material.type || "Material"}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 text-xl font-black text-navy dark:text-white">
                    {material.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                    {material.content || "No content preview added yet."}
                  </p>

                  <button
                    onClick={() => toggleMaterial(material.id)}
                    className="mt-4 rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
                      <Info label="File URL" value={material.file_url} />
                      <Info label="Video URL" value={material.video_url} />
                      <Info label="Thumbnail URL" value={material.thumbnail_url} />

                      {material.content && (
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
                            Content
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                            {material.content}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => openEditMaterial(material)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-soft px-4 py-2 text-xs font-black text-navy transition hover:bg-orange hover:text-white dark:bg-slate-950/50 dark:text-white dark:hover:bg-orange"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteMaterial(material)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-600"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMaterials.length > 10 && (
            <div className="mt-8 flex justify-center">
              {hasMoreMaterials ? (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] dark:bg-white/10"
                >
                  Show More Materials
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

      {materialModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-3xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  {editingMaterial ? "Edit Material" : "New Material"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  {editingMaterial ? "Update Material" : "Add Material"}
                </h3>
              </div>

              <button
                onClick={() => setMaterialModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Course"
                value={materialForm.course_id}
                onChange={handleCourseChange}
                options={courses.map((course) => ({
                  label: `${course.code} - ${course.title}`,
                  value: course.id,
                }))}
              />

              <Select
                label="Topic"
                value={materialForm.topic_id}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, topic_id: value }))
                }
                options={filteredTopicsForForm.map((topic) => ({
                  label: topic.title,
                  value: topic.id,
                }))}
              />

              <Input
                label="Material Title"
                value={materialForm.title}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, title: value }))
                }
              />

              <Select
                label="Type"
                value={materialForm.type}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, type: value }))
                }
                options={["PDF", "Video", "Note", "Image", "Link"].map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="File URL"
                value={materialForm.file_url}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, file_url: value }))
                }
              />

              <Input
                label="Video URL"
                value={materialForm.video_url}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, video_url: value }))
                }
              />

              <Input
                label="Thumbnail URL"
                value={materialForm.thumbnail_url}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, thumbnail_url: value }))
                }
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Content / Note"
                value={materialForm.content}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, content: value }))
                }
              />
            </div>

            <button
              onClick={handleSaveMaterial}
              disabled={savingMaterial}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
            >
              {savingMaterial
                ? "Saving..."
                : editingMaterial
                ? "Save Changes"
                : "Save Material"}
            </button>
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

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
        {label}
      </p>
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block break-all text-sm font-bold text-navy underline transition hover:text-orange dark:text-white dark:hover:text-orange"
      >
        {value}
      </a>
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
        rows={5}
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
