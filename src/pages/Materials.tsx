import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  FileText,
  FolderInput,
  LinkIcon,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";
import SelectRaw from "../components/SelectRaw";
import { useAdminAuth } from "../context/AuthContext";
import { useSelectColors } from "../hooks/useIsDarkMode";
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
import type { Material, MaterialType } from "../services/materials";
import {
  bulkCreateMaterials,
  createMaterial,
  deleteMaterial,
  getMaterials,
  updateMaterial,
} from "../services/materials";
import {
  fileNameToTitle,
  listDriveFolderFiles,
  mimeTypeToMaterialType,
  type DriveFile,
} from "../services/driveImport";

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

const emptyMaterialForm = {
  course_id: "",
  topic_id: "",
  title: "",
  type: "pdf",
  file_url: "",
  content: "",
  summary_1: "",
  video_url: "",
  thumbnail_url: "",
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

// Row shape used inside the Bulk Import modal. Extends the raw Drive file
// with per-row editable fields, including its OWN topic assignment —
// this is what lets one folder cover several topics at once.
type BulkRow = DriveFile & {
  title: string;
  type: string;
  topic_id: string;
  selected: boolean;
};

export default function Materials() {
  const { profile } = useAdminAuth();
  const isSuperAdmin = profile?.role === "super_admin";
  const selectColors = useSelectColors();

  const [materials, setMaterials] = useState<Material[]>([]);
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
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [expandedMaterials, setExpandedMaterials] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);

  // --- Bulk Drive import state ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFolderLink, setBulkFolderLink] = useState("");
  const [bulkCourseId, setBulkCourseId] = useState("");
  const [bulkDefaultTopicId, setBulkDefaultTopicId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<BulkRow[]>([]);

  const facultyOptions = Object.keys(LASU_DATA);
  const departmentOptions = getDepartmentOptions(context.school, context.faculty);
  const levelOptions = getLevelOptions(context.school, context.department);

  const workspacePeriodId = periodControl?.workspace_period_id || periods[0]?.id || "";
  const workspacePeriod = periods.find((item) => item.id === workspacePeriodId) || null;
  const periodType = getAcademicPeriodType(context.department);

  // Materials can now be added/edited/deleted from any department that has
  // access to a course — whether it originally created the course or the
  // course was shared into their workspace. Kept the name `ownedCourses`
  // so nothing else in this file needs renaming, but it's no longer
  // filtered down to non-shared courses only.
  const ownedCourses = courses;
  const courseById = useMemo(() => {
    return new Map(courses.map((course) => [course.id, course]));
  }, [courses]);

  const filteredTopicsForForm = useMemo(() => {
    if (!materialForm.course_id) return [];
    return topics.filter((topic) => topic.course_id === materialForm.course_id);
  }, [topics, materialForm.course_id]);

  const filteredTopicsForFilter = useMemo(() => {
    if (!courseFilter) return topics;
    return topics.filter((topic) => topic.course_id === courseFilter);
  }, [topics, courseFilter]);

  // Topics available for the course picked in the Bulk Import modal
  const bulkTopicsForCourse = useMemo(() => {
    if (!bulkCourseId) return [];
    return topics.filter((topic) => topic.course_id === bulkCourseId);
  }, [topics, bulkCourseId]);

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
      setMaterials([]);
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
      setMaterials([]);
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
      const materialsData = await getMaterials({
        course_ids: courseIds,
        topic_ids: topicIds,
      });

      setCourses(coursesData);
      setTopics(topicsData);
      setMaterials(materialsData);
    } catch (error: any) {
      alert(error.message || "Could not load materials.");
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
      setVisibleCount(10);
    } catch (error: any) {
      alert(error.message || "Could not switch workspace period.");
    } finally {
      setSavingWorkspace(false);
    }
  }

  function toggleMaterial(id: string) {
    setExpandedMaterials((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function openCreateMaterial() {
    if (ownedCourses.length === 0) {
      alert("Create a course in this workspace first.");
      return;
    }

    // Find the first course (in order) that actually has a topic under it —
    // don't just check ownedCourses[0], since the first course in the list
    // might simply not have a topic yet while a later one does.
    const firstCourseWithTopic = ownedCourses.find((course) =>
      topics.some((topic) => topic.course_id === course.id)
    );

    if (!firstCourseWithTopic) {
      alert("Create a topic under a course first.");
      return;
    }

    const firstTopic = topics.find(
      (topic) => topic.course_id === firstCourseWithTopic.id
    );

    setEditingMaterial(null);
    setMaterialForm({
      ...emptyMaterialForm,
      course_id: firstCourseWithTopic.id,
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
      type: String(material.type || "pdf").toLowerCase(),
      file_url: material.file_url || "",
      content: material.content || "",
      summary_1: material.summary_1 || "",
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
        summary_1: materialForm.summary_1.trim(),
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

  // --- Bulk Drive import handlers ---

  function openBulkImport() {
    if (ownedCourses.length === 0) {
      alert("Create a course in this workspace first.");
      return;
    }

    const firstCourseWithTopic = ownedCourses.find((course) =>
      topics.some((topic) => topic.course_id === course.id)
    );

    if (!firstCourseWithTopic) {
      alert("Create a topic under a course first.");
      return;
    }

    const firstTopic = topics.find(
      (topic) => topic.course_id === firstCourseWithTopic.id
    );

    setBulkFolderLink("");
    setBulkCourseId(firstCourseWithTopic.id);
    setBulkDefaultTopicId(firstTopic?.id || "");
    setBulkFiles([]);
    setBulkModalOpen(true);
  }

  function handleBulkCourseChange(value: string) {
    const firstTopic = topics.find((topic) => topic.course_id === value);
    setBulkCourseId(value);
    setBulkDefaultTopicId(firstTopic?.id || "");

    // Re-point any already-fetched rows to a valid topic under the new course
    setBulkFiles((prev) =>
      prev.map((file) => ({ ...file, topic_id: firstTopic?.id || "" }))
    );
  }

  function handleBulkDefaultTopicChange(value: string) {
    setBulkDefaultTopicId(value);
    // Apply this default to every row that hasn't been individually overridden
    setBulkFiles((prev) => prev.map((file) => ({ ...file, topic_id: value })));
  }

  async function handleFetchFolder() {
    if (!bulkFolderLink.trim()) {
      alert("Paste a Google Drive folder link first.");
      return;
    }

    if (!bulkDefaultTopicId) {
      alert("Pick a course/topic first so files have somewhere to default to.");
      return;
    }

    try {
      setBulkLoading(true);
      const files = await listDriveFolderFiles(bulkFolderLink);

      if (files.length === 0) {
        alert("No files found in that folder (or it isn't shared publicly yet).");
      }

      setBulkFiles(
        files.map((file) => ({
          ...file,
          title: fileNameToTitle(file.name),
          type: mimeTypeToMaterialType(file.mimeType),
          topic_id: bulkDefaultTopicId,
          selected: true,
        }))
      );
    } catch (error: any) {
      alert(error.message || "Could not read that Drive folder.");
    } finally {
      setBulkLoading(false);
    }
  }

  function updateBulkFile(id: string, patch: Partial<BulkRow>) {
    setBulkFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...patch } : file))
    );
  }

  function toggleAllBulkFiles(selected: boolean) {
    setBulkFiles((prev) => prev.map((file) => ({ ...file, selected })));
  }

  async function handleBulkImport() {
    const toImport = bulkFiles.filter((file) => file.selected);

    if (!bulkCourseId || toImport.length === 0) {
      alert("Select a course and at least one file.");
      return;
    }

    const missingTopic = toImport.find((file) => !file.topic_id);
    if (missingTopic) {
      alert(`"${missingTopic.title}" has no topic assigned. Assign a topic to every selected file.`);
      return;
    }

    try {
      setBulkImporting(true);

      const payloads = toImport.map((file) => ({
        course_id: bulkCourseId,
        topic_id: file.topic_id,
        title: file.title.trim() || file.name,
        type: file.type as MaterialType,
        file_url: file.webViewLink,
        content: "",
        summary_1: "",
        video_url: file.type === "video" ? file.webViewLink : "",
        thumbnail_url: file.thumbnailLink || "",
      }));

      const created = await bulkCreateMaterials(payloads);

      await createAdminLog({
        admin_id: profile?.id,
        action: "BULK_CREATE_MATERIALS",
        target_table: "materials",
        target_id: bulkCourseId,
        description: `Bulk imported ${created.length} materials from Drive folder`,
      });

      setBulkModalOpen(false);
      await loadPageData();
      alert(`Imported ${created.length} materials.`);
    } catch (error: any) {
      alert(error.message || "Bulk import failed.");
    } finally {
      setBulkImporting(false);
    }
  }

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();

    return materials.filter((material) => {
      const course = courseById.get(material.course_id);

      const matchesSearch =
        !q ||
        material.title?.toLowerCase().includes(q) ||
        material.type?.toLowerCase().includes(q) ||
        material.content?.toLowerCase().includes(q) ||
        material.summary_1?.toLowerCase().includes(q) ||
        material.courses?.code?.toLowerCase().includes(q) ||
        material.courses?.title?.toLowerCase().includes(q) ||
        material.topics?.title?.toLowerCase().includes(q) ||
        course?.code?.toLowerCase().includes(q) ||
        course?.title?.toLowerCase().includes(q);

      const matchesCourse = !courseFilter || material.course_id === courseFilter;
      const matchesTopic = !topicFilter || material.topic_id === topicFilter;

      return matchesSearch && matchesCourse && matchesTopic;
    });
  }, [materials, search, courseFilter, topicFilter, courseById]);

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
            Add PDFs, videos, links and notes inside the selected workspace period.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            onClick={openBulkImport}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] sm:w-auto dark:bg-white/10"
          >
            <FolderInput size={18} />
            Bulk Import from Drive
          </button>

          <button
            onClick={openCreateMaterial}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
          >
            <Plus size={18} />
            Add Material
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
              Department Materials
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Pick the department and workspace period. Materials shown here follow the courses and topics in that period.
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
              This controls which course materials you are managing.
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
          label="Workspace Materials"
          value={materials.length}
          icon={FileText}
          color="bg-orange/10 text-orange"
        />
        <SummaryCard
          label="Courses In Period"
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

        <SearchableSelect
          value={courseFilter}
          onChange={(value) => {
            setCourseFilter(value);
            setTopicFilter("");
            setVisibleCount(10);
          }}
          placeholder="All Courses"
          searchPlaceholder="Search courses..."
          emptyMessage="No course found"
          options={[
            { label: "All Courses", value: "" },
            ...courses.map((course) => ({
              label: `${course.code} - ${course.title}${course.is_shared ? " (Shared)" : ""}`,
              value: course.id,
              description: course.academic_periods?.name || course.semester || undefined,
            })),
          ]}
        />

        <SearchableSelect
          value={topicFilter}
          onChange={(value) => {
            setTopicFilter(value);
            setVisibleCount(10);
          }}
          placeholder="All Topics"
          searchPlaceholder="Search topics..."
          emptyMessage={courseFilter ? "No topic found for this course" : "No topic found"}
          options={[
            { label: "All Topics", value: "" },
            ...filteredTopicsForFilter.map((topic) => ({
              label: topic.title,
              value: topic.id,
              description: courseById.get(topic.course_id)?.code || topic.courses?.code || undefined,
            })),
          ]}
        />
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
            No materials in this workspace yet
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Add materials under courses and topics in {workspacePeriod?.name || "this period"}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleMaterials.map((material) => {
              const isExpanded = expandedMaterials.includes(material.id);
              const course = courseById.get(material.course_id);
              const isShared = Boolean(course?.is_shared);

              return (
                <div
                  key={material.id}
                  className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
                      {course?.code || material.courses?.code || "Course"}
                    </span>

                    <span className="rounded-full bg-soft px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
                      {material.topics?.title || "Topic"}
                    </span>

                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-600 dark:text-green-300">
                      {material.type || "Material"}
                    </span>

                    {isShared && (
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-300">
                        Shared
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-xl font-black text-navy dark:text-white">
                    {material.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                    {material.summary_1 || material.content || "No summary or content preview added yet."}
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

                      {material.summary_1 && (
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
                            Summary
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                            {material.summary_1}
                          </p>
                        </div>
                      )}

                      {isShared && (
                        <p className="text-xs font-black text-blue-600 dark:text-blue-300">
                          Original department: {course?.source_department || "Not set"}
                        </p>
                      )}

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
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Materials will be saved under {workspacePeriod?.name || "the selected workspace period"}.
                </p>
              </div>

              <button
                onClick={() => setMaterialModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SearchableSelect
                label="Course"
                value={materialForm.course_id}
                onChange={handleCourseChange}
                placeholder="Select course"
                searchPlaceholder="Search courses..."
                emptyMessage="No owned course found"
                clearable={false}
                options={ownedCourses.map((course) => ({
                  label: `${course.code} - ${course.title}`,
                  value: course.id,
                  description: course.academic_periods?.name || course.semester || undefined,
                }))}
              />

              <SearchableSelect
                label="Topic"
                value={materialForm.topic_id}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, topic_id: value }))
                }
                placeholder={materialForm.course_id ? "Select topic" : "Select course first"}
                searchPlaceholder="Search topics..."
                emptyMessage={materialForm.course_id ? "No topic found under this course" : "Select a course first"}
                disabled={!materialForm.course_id}
                clearable={false}
                options={filteredTopicsForForm.map((topic) => ({
                  label: topic.title,
                  value: topic.id,
                  description: courseById.get(topic.course_id)?.code || undefined,
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
                options={["pdf", "video", "note", "image", "link"].map((item) => ({
                  label: item.toUpperCase(),
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

            <div className="mt-4">
              <Textarea
                label="Material Summary"
                value={materialForm.summary_1}
                onChange={(value: string) =>
                  setMaterialForm((prev) => ({ ...prev, summary_1: value }))
                }
              />
              <p className="mt-2 text-xs font-bold text-slate-400">
                This is the single summary students will see for this material in Study Mode.
              </p>
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

      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-3xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  Bulk Import
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  Import from Drive Folder
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Folder must be shared "Anyone with the link — Viewer". Each file gets its own
                  topic below, so one folder can cover several topics.
                </p>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SearchableSelect
                label="Course"
                value={bulkCourseId}
                onChange={handleBulkCourseChange}
                placeholder="Select course"
                searchPlaceholder="Search courses..."
                emptyMessage="No owned course found"
                clearable={false}
                options={ownedCourses.map((course) => ({
                  label: `${course.code} - ${course.title}`,
                  value: course.id,
                }))}
              />

              <SearchableSelect
                label="Default Topic (applies to all rows, editable per file below)"
                value={bulkDefaultTopicId}
                onChange={handleBulkDefaultTopicChange}
                placeholder={bulkCourseId ? "Select default topic" : "Select course first"}
                searchPlaceholder="Search topics..."
                emptyMessage="No topic found under this course"
                disabled={!bulkCourseId}
                clearable={false}
                options={bulkTopicsForCourse.map((topic) => ({
                  label: topic.title,
                  value: topic.id,
                }))}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={bulkFolderLink}
                onChange={(e) => setBulkFolderLink(e.target.value)}
                placeholder="Paste Google Drive folder link"
                className="h-12 flex-1 rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
              />
              <button
                onClick={handleFetchFolder}
                disabled={bulkLoading}
                className="rounded-2xl bg-orange px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-60"
              >
                {bulkLoading ? "Fetching..." : "Fetch Files"}
              </button>
            </div>

            {bulkFiles.length > 0 && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-orange">
                    {bulkFiles.filter((f) => f.selected).length} of {bulkFiles.length} selected
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAllBulkFiles(true)} className="text-xs font-black text-orange">
                      Select All
                    </button>
                    <button onClick={() => toggleAllBulkFiles(false)} className="text-xs font-black text-slate-400">
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl bg-soft p-3 dark:bg-slate-950/40">
                  {bulkFiles.map((file) => (
                    <div
                      key={file.id}
                      className="grid grid-cols-1 gap-2 rounded-xl bg-white/80 p-3 sm:grid-cols-[auto_1.3fr_0.7fr_0.9fr] sm:items-center dark:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={file.selected}
                        onChange={(e) => updateBulkFile(file.id, { selected: e.target.checked })}
                        className="h-4 w-4"
                      />

                      <input
                        value={file.title}
                        onChange={(e) => updateBulkFile(file.id, { title: e.target.value })}
                        className="h-9 w-full rounded-lg border border-orange/10 bg-transparent px-2 text-sm font-bold text-navy outline-none dark:text-white"
                      />

                      <select
                        value={file.type}
                        onChange={(e) => updateBulkFile(file.id, { type: e.target.value })}
                        style={selectColors}
                        className="h-9 rounded-lg border border-orange/10 bg-transparent px-2 text-xs font-black text-navy outline-none dark:text-white"
                      >
                        {["pdf", "video", "note", "image", "link"].map((t) => (
                          <option key={t} value={t} style={selectColors}>
                            {t.toUpperCase()}
                          </option>
                        ))}
                      </select>

                      <select
                        value={file.topic_id}
                        onChange={(e) => updateBulkFile(file.id, { topic_id: e.target.value })}
                        style={selectColors}
                        className="h-9 rounded-lg border border-orange/10 bg-transparent px-2 text-xs font-bold text-navy outline-none dark:text-white"
                      >
                        <option value="" style={selectColors}>Select topic...</option>
                        {bulkTopicsForCourse.map((topic) => (
                          <option key={topic.id} value={topic.id} style={selectColors}>
                            {topic.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleBulkImport}
                  disabled={bulkImporting}
                  className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {bulkImporting
                    ? "Importing..."
                    : `Import ${bulkFiles.filter((f) => f.selected).length} Materials`}
                </button>
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
  const selectColors = useSelectColors();

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectColors}
        className="h-12 w-full rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      >
        {options.length === 0 && (
          <option value="" style={selectColors}>
            No option available
          </option>
        )}

        {options.map((item: any) => (
          <option key={item.value} value={item.value} style={selectColors}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}


