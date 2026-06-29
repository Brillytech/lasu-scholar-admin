import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Atom,
  BarChart3,
  Beaker,
  BookOpen,
  Brain,
  Briefcase,
  Bug,
  Calculator,
  CheckCircle2,
  CircuitBoard,
  Code2,
  Cog,
  Cpu,
  Database,
  Dna,
  Edit3,
  FileText,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Hospital,
  Landmark,
  Languages,
  Layers3,
  Leaf,
  Library,
  Microscope,
  Music,
  NotebookPen,
  PenTool,
  Pill,
  Plus,
  Scale,
  Search,
  Share2,
  ShieldPlus,
  SlidersHorizontal,
  Stethoscope,
  Syringe,
  TestTube,
  Theater,
  Trash2,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useAdminAuth } from "../context/AuthContext";
import { createAdminLog } from "../services/adminLogs";
import type {
  AcademicPeriod,
  AppPeriodControl,
  Course,
  CourseShare,
} from "../services/courses";
import {
  createCourse,
  deleteCourse,
  deleteCourseShare,
  ensureAcademicPeriods,
  getAcademicPeriodType,
  getAppPeriodControl,
  getCourseShares,
  getCourses,
  shareCourseWithDepartment,
  updateCourse,
  updateLiveAppPeriod,
  updateWorkspacePeriod,
} from "../services/courses";

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

const emptyCourseForm = {
  code: "",
  title: "",
  status: "active",
  school: "LASU",
  faculty: "",
  department: "",
  level: "100L",
  academic_period_id: "",
  course_icon: "book",
  course_color: "orange",
};

const emptyShareForm = {
  school: "LASU",
  faculty: "",
  department: "",
  level: "100L",
  academic_period_id: "",
};

const COURSE_ICONS = [
  { label: "Book", value: "book", icon: BookOpen },
  { label: "Notebook", value: "notebook", icon: NotebookPen },
  { label: "Library", value: "library", icon: Library },
  { label: "Graduation", value: "graduation", icon: GraduationCap },
  { label: "Document", value: "document", icon: FileText },

  { label: "Stethoscope", value: "stethoscope", icon: Stethoscope },
  { label: "Nursing", value: "nursing", icon: Stethoscope },
  { label: "Medicine", value: "medicine", icon: Hospital },
  { label: "Clinical", value: "clinical", icon: Activity },
  { label: "Anatomy", value: "anatomy", icon: HeartPulse },
  { label: "Heart", value: "heart", icon: HeartPulse },
  { label: "Brain", value: "brain", icon: Brain },
  { label: "Biology", value: "biology", icon: Dna },
  { label: "DNA", value: "dna", icon: Dna },
  { label: "Microscope", value: "microscope", icon: Microscope },
  { label: "Laboratory", value: "lab", icon: Microscope },
  { label: "Pharmacy", value: "pharmacy", icon: Pill },
  { label: "Pill", value: "pill", icon: Pill },
  { label: "Injection", value: "injection", icon: Syringe },
  { label: "Dentistry", value: "dentistry", icon: ShieldPlus },

  { label: "Chemistry", value: "chemistry", icon: FlaskConical },
  { label: "Flask", value: "flask", icon: FlaskConical },
  { label: "Test Tube", value: "test-tube", icon: TestTube },
  { label: "Beaker", value: "beaker", icon: Beaker },
  { label: "Atom", value: "atom", icon: Atom },
  { label: "Plant", value: "plant", icon: Leaf },
  { label: "Microbiology", value: "microbiology", icon: Bug },

  { label: "Maths", value: "math", icon: Calculator },
  { label: "Statistics", value: "statistics", icon: BarChart3 },
  { label: "Research", value: "research", icon: BarChart3 },

  { label: "Electricity", value: "bolt", icon: Zap },
  { label: "CPU", value: "cpu", icon: Cpu },
  { label: "Code", value: "code", icon: Code2 },
  { label: "Database", value: "database", icon: Database },
  { label: "Circuit", value: "circuit", icon: CircuitBoard },
  { label: "Engineering", value: "engineering", icon: Wrench },
  { label: "Technology", value: "technology", icon: Cog },

  { label: "Business", value: "business", icon: Briefcase },
  { label: "Economics", value: "economics", icon: Landmark },
  { label: "Management", value: "management", icon: Users },

  { label: "Law", value: "law", icon: Scale },
  { label: "Language", value: "language", icon: Languages },
  { label: "Music", value: "music", icon: Music },
  { label: "Theatre", value: "theatre", icon: Theater },
  { label: "Writing", value: "writing", icon: PenTool },
];

const COURSE_COLORS = [
  { label: "Orange", value: "orange", bg: "#fff2df", fg: "#f97316", border: "#fed7aa" },
  { label: "Blue", value: "blue", bg: "#eaf2ff", fg: "#2563eb", border: "#bfdbfe" },
  { label: "Green", value: "green", bg: "#eafaf1", fg: "#16a34a", border: "#bbf7d0" },
  { label: "Purple", value: "purple", bg: "#f3e8ff", fg: "#9333ea", border: "#e9d5ff" },
  { label: "Red", value: "red", bg: "#fee2e2", fg: "#dc2626", border: "#fecaca" },
  { label: "Gold", value: "gold", bg: "#fef9c3", fg: "#ca8a04", border: "#fde68a" },
];

function getCourseIcon(value?: string | null) {
  const aliases: Record<string, string> = {
    tooth: "dentistry",
    chart: "statistics",
    hospital: "medicine",
    doctor: "stethoscope",
    lab: "microscope",
    biology: "dna",
  };

  const cleanValue = value ? aliases[value] || value : "book";
  return COURSE_ICONS.find((item) => item.value === cleanValue)?.icon || BookOpen;
}

function getCourseColor(value?: string | null) {
  return COURSE_COLORS.find((item) => item.value === value) || COURSE_COLORS[0];
}

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
  void department;

  if (school !== "LASUCOM") return ["100L", "200L", "300L", "400L", "500L"];

  /*
    LASUCOM students can have real 100L department courses.
    100L stays semester-based; Medicine/Dentistry switch to blocks from 200L upward.
  */
  return ["100L", "200L", "300L", "400L", "500L", "600L"];
}

export default function Courses() {
  const { profile } = useAdminAuth();
  const isSuperAdmin = profile?.role === "super_admin";

  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodControl, setPeriodControl] = useState<AppPeriodControl | null>(null);

  const [shares, setShares] = useState<CourseShare[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [context, setContext] = useState(emptyContext);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [shareForm, setShareForm] = useState(emptyShareForm);
  const [sharePeriods, setSharePeriods] = useState<AcademicPeriod[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [savingControl, setSavingControl] = useState(false);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);

  const facultyOptions = Object.keys(LASU_DATA);

  const departmentOptions = getDepartmentOptions(context.school, context.faculty);
  const levelOptions = getLevelOptions(context.school, context.department);

  const shareDepartmentOptions = getDepartmentOptions(shareForm.school, shareForm.faculty);
  const shareLevelOptions = getLevelOptions(shareForm.school, shareForm.department);

  const workspacePeriodId = periodControl?.workspace_period_id || periods[0]?.id || "";
  const livePeriodId = periodControl?.live_period_id || periods[0]?.id || "";
  const workspacePeriod = periods.find((item) => item.id === workspacePeriodId) || null;
  const livePeriod = periods.find((item) => item.id === livePeriodId) || null;

  const periodType = getAcademicPeriodType(context.department, context.level);

  useEffect(() => {
    loadAcademicWorkspace();
  }, [context.school, context.faculty, context.department, context.level]);

  useEffect(() => {
    if (workspacePeriodId) {
      loadCourses();
    }
  }, [workspacePeriodId]);

  useEffect(() => {
    loadSharePeriods();
  }, [shareForm.school, shareForm.faculty, shareForm.department, shareForm.level]);

  async function loadAcademicWorkspace() {
    const faculty = getContextFaculty(context);

    if (!context.school || !context.department || !context.level || (context.school === "LASU" && !faculty)) {
      setPeriods([]);
      setPeriodControl(null);
      setCourses([]);
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

        const withLive = await updateLiveAppPeriod({
          school: context.school,
          faculty,
          department: context.department,
          level: context.level,
          live_period_id: nextPeriods[0].id,
        });

        setPeriodControl({
          ...created,
          live_period_id: withLive.live_period_id,
        });
      } else {
        setPeriodControl(control);
      }
    } catch (error: any) {
      alert(error.message || "Could not load academic periods.");
    } finally {
      setLoadingPeriods(false);
    }
  }

  async function loadCourses() {
    const faculty = getContextFaculty(context);

    if (!context.school || !context.department || !context.level || !workspacePeriodId) {
      setCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await getCourses({
        school: context.school,
        faculty,
        department: context.department,
        level: context.level,
        academic_period_id: workspacePeriodId,
      });

      setCourses(data);
    } catch (error: any) {
      alert(error.message || "Could not load courses.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSharePeriods() {
    const faculty =
      shareForm.school === "LASUCOM" ? "College of Medicine" : clean(shareForm.faculty);

    if (!shareForm.school || !shareForm.department || !shareForm.level || (shareForm.school === "LASU" && !faculty)) {
      setSharePeriods([]);
      return;
    }

    try {
      const data = await ensureAcademicPeriods({
        school: shareForm.school,
        faculty,
        department: shareForm.department,
        level: shareForm.level,
      });

      setSharePeriods(data);

      const matchedByName = data.find(
        (item) => item.name === selectedCourse?.academic_periods?.name
      );

      setShareForm((prev) => ({
        ...prev,
        academic_period_id:
          prev.academic_period_id || matchedByName?.id || data[0]?.id || "",
      }));
    } catch (error: any) {
      alert(error.message || "Could not load sharing periods.");
    }
  }

  function toggleCourseDetails(id: string) {
    setExpandedCourses((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleContextSchoolChange(value: string) {
    if (value === "LASUCOM") {
      setContext({
        school: "LASUCOM",
        faculty: "College of Medicine",
        department: "",
        level: "100L",
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

  function handleShareSchoolChange(value: string) {
    if (value === "LASUCOM") {
      setShareForm({
        school: "LASUCOM",
        faculty: "College of Medicine",
        department: "",
        level: "100L",
        academic_period_id: "",
      });
      return;
    }

    setShareForm({
      school: "LASU",
      faculty: "",
      department: "",
      level: "100L",
      academic_period_id: "",
    });
  }

  function handleShareFacultyChange(value: string) {
    setShareForm((prev) => ({
      ...prev,
      faculty: value,
      department: "",
      academic_period_id: "",
    }));
  }

  function handleShareDepartmentChange(value: string) {
    const levels = getLevelOptions(shareForm.school, value);

    setShareForm((prev) => ({
      ...prev,
      department: value,
      level: levels[0] || prev.level,
      academic_period_id: "",
    }));
  }

  async function handleWorkspaceSwitch(periodId: string) {
    if (!periodId) return;

    const faculty = getContextFaculty(context);

    try {
      setSavingControl(true);

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

      await createAdminLog({
        admin_id: profile?.id,
        action: "UPDATE_WORKSPACE_PERIOD",
        target_table: "app_period_controls",
        target_id: updated.id,
        description: `Workspace period changed to ${
          periods.find((item) => item.id === periodId)?.name || "selected period"
        } for ${context.department} ${context.level}`,
      });
    } catch (error: any) {
      alert(error.message || "Could not switch workspace period.");
    } finally {
      setSavingControl(false);
    }
  }

  async function handleLiveSwitch(periodId: string) {
    if (!periodId) return;

    const selectedPeriod = periods.find((item) => item.id === periodId);
    const confirmed = confirm(
      `Switch live app access to ${selectedPeriod?.name || "this period"} for ${context.department} ${context.level}? Students will only see content under this period.`
    );

    if (!confirmed) return;

    const faculty = getContextFaculty(context);

    try {
      setSavingControl(true);

      const updated = await updateLiveAppPeriod({
        school: context.school,
        faculty,
        department: context.department,
        level: context.level,
        live_period_id: periodId,
      });

      setPeriodControl((prev) => ({
        ...(prev || updated),
        ...updated,
        workspace_period_id: prev?.workspace_period_id || updated.workspace_period_id,
      }));

      await createAdminLog({
        admin_id: profile?.id,
        action: "UPDATE_LIVE_APP_PERIOD",
        target_table: "app_period_controls",
        target_id: updated.id,
        description: `Live app period changed to ${
          selectedPeriod?.name || "selected period"
        } for ${context.department} ${context.level}`,
      });
    } catch (error: any) {
      alert(error.message || "Could not switch live app period.");
    } finally {
      setSavingControl(false);
    }
  }

  function openCreateCourse() {
    if (!context.department || !workspacePeriodId) {
      alert("Select a department, level and workspace period first.");
      return;
    }

    setEditingCourse(null);
    setCourseForm({
      ...emptyCourseForm,
      school: context.school,
      faculty: getContextFaculty(context),
      department: context.department,
      level: context.level,
      academic_period_id: workspacePeriodId,
    });
    setCourseModalOpen(true);
  }

  function openEditCourse(course: Course) {
    setEditingCourse(course);
    setCourseForm({
      code: course.code || "",
      title: course.title || "",
      status: course.status || "active",
      school: course.school || context.school,
      faculty: course.faculty || getContextFaculty(context),
      department: course.department || context.department,
      level: course.level || context.level,
      academic_period_id: course.academic_period_id || workspacePeriodId,
      course_icon: course.course_icon || "book",
      course_color: course.course_color || "orange",
    });
    setCourseModalOpen(true);
  }

  async function handleSaveCourse() {
    if (!courseForm.code.trim() || !courseForm.title.trim()) {
      alert("Course code and title are required.");
      return;
    }

    if (!courseForm.school || !courseForm.department || !courseForm.level || !courseForm.academic_period_id) {
      alert("Please select school, department, level and academic period.");
      return;
    }

    try {
      setSavingCourse(true);

      const selectedPeriod = periods.find(
        (item) => item.id === courseForm.academic_period_id
      );

      if (editingCourse) {
        const updated = await updateCourse(editingCourse.id, {
          code: courseForm.code.trim().toUpperCase(),
          title: courseForm.title.trim(),
          semester: selectedPeriod?.name || "",
          status: courseForm.status,
          school: courseForm.school,
          faculty: courseForm.faculty,
          department: courseForm.department,
          level: courseForm.level,
          academic_period_id: courseForm.academic_period_id,
          course_icon: courseForm.course_icon,
          course_color: courseForm.course_color,
        });

        await createAdminLog({
          admin_id: profile?.id,
          action: "UPDATE_COURSE",
          target_table: "courses",
          target_id: updated.id,
          description: `Updated course ${updated.code} - ${updated.title}`,
        });
      } else {
        const created = await createCourse({
          code: courseForm.code.trim().toUpperCase(),
          title: courseForm.title.trim(),
          semester: selectedPeriod?.name || "",
          status: courseForm.status,
          school: courseForm.school,
          faculty: courseForm.faculty,
          department: courseForm.department,
          level: courseForm.level,
          academic_period_id: courseForm.academic_period_id,
          course_icon: courseForm.course_icon,
          course_color: courseForm.course_color,
        });

        await createAdminLog({
          admin_id: profile?.id,
          action: "CREATE_COURSE",
          target_table: "courses",
          target_id: created.id,
          description: `Created ${created.code} under ${courseForm.department} ${courseForm.level} - ${selectedPeriod?.name || "period"}`,
        });
      }

      setCourseModalOpen(false);
      await loadCourses();
    } catch (error: any) {
      alert(error.message || "Could not save course.");
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleDeleteCourse(course: Course) {
    if (!isSuperAdmin) {
      alert("Only super admins can delete courses.");
      return;
    }

    const confirmed = confirm(
      `Delete ${course.code}? This will also remove its topics, materials and shared access.`
    );

    if (!confirmed) return;

    try {
      await deleteCourse(course.id);

      await createAdminLog({
        admin_id: profile?.id,
        action: "DELETE_COURSE",
        target_table: "courses",
        target_id: course.id,
        description: `Deleted course ${course.code} - ${course.title}`,
      });

      if (selectedCourse?.id === course.id) {
        setSelectedCourse(null);
        setSharePanelOpen(false);
        setShares([]);
      }

      await loadCourses();
    } catch (error: any) {
      alert(error.message || "Could not delete course.");
    }
  }

  async function openShares(course: Course) {
    setSelectedCourse(course);
    setSharePanelOpen(true);

    setShareForm({
      ...emptyShareForm,
      academic_period_id: course.academic_period_id || "",
    });

    try {
      const data = await getCourseShares(course.id);
      setShares(data);
    } catch (error: any) {
      alert(error.message || "Could not load shared departments.");
    }
  }

  async function handleCreateShare() {
    if (!selectedCourse) return;

    const faculty =
      shareForm.school === "LASUCOM"
        ? "College of Medicine"
        : shareForm.faculty.trim();

    if (
      !shareForm.school.trim() ||
      !faculty ||
      !shareForm.department.trim() ||
      !shareForm.level.trim() ||
      !shareForm.academic_period_id
    ) {
      alert("Please select school, faculty/department, level and period.");
      return;
    }

    try {
      setSavingShare(true);

      const createdShare = await shareCourseWithDepartment({
        course_id: selectedCourse.id,
        school: shareForm.school.trim(),
        faculty,
        department: shareForm.department.trim(),
        level: shareForm.level.trim(),
        academic_period_id: shareForm.academic_period_id,
      });

      await createAdminLog({
        admin_id: profile?.id,
        action: "SHARE_COURSE_WITH_DEPARTMENT",
        target_table: "course_shares",
        target_id: createdShare.id,
        description: `Shared ${selectedCourse.code} with ${createdShare.department} ${createdShare.level}`,
      });

      setShareForm(emptyShareForm);

      const data = await getCourseShares(selectedCourse.id);
      setShares(data);
    } catch (error: any) {
      alert(error.message || "Could not share course.");
    } finally {
      setSavingShare(false);
    }
  }

  async function handleDeleteShare(item: CourseShare) {
    if (!isSuperAdmin) {
      alert("Only super admins can remove shared department access.");
      return;
    }

    const confirmed = confirm(
      `Remove shared access for ${item.department} ${item.level}?`
    );

    if (!confirmed) return;

    try {
      await deleteCourseShare(item.id);

      await createAdminLog({
        admin_id: profile?.id,
        action: "DELETE_COURSE_SHARE",
        target_table: "course_shares",
        target_id: item.id,
        description: `Removed shared access for ${selectedCourse?.code || "course"} from ${item.department} ${item.level}`,
      });

      if (selectedCourse) {
        const data = await getCourseShares(selectedCourse.id);
        setShares(data);
      }
    } catch (error: any) {
      alert(error.message || "Could not remove shared access.");
    }
  }

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return courses;

    return courses.filter((course) => {
      return (
        course.code?.toLowerCase().includes(q) ||
        course.title?.toLowerCase().includes(q) ||
        course.semester?.toLowerCase().includes(q) ||
        course.status?.toLowerCase().includes(q) ||
        course.department?.toLowerCase().includes(q)
      );
    });
  }, [courses, search]);

  const visibleCourses = filteredCourses.slice(0, visibleCount);
  const hasMoreCourses = filteredCourses.length > visibleCount;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Course Management
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Courses
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Create courses directly under a department and period, then share access with another department when needed.
          </p>
        </div>

        <button
          onClick={openCreateCourse}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <Plus size={18} />
          Create Course
        </button>
      </div>

      <div className="mb-6 rounded-[32px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-orange">
              <SlidersHorizontal size={14} />
              Academic Control Center
            </div>
            <h2 className="mt-3 text-2xl font-black text-navy dark:text-white">
              Department Workspace
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Choose the department, level and the period you want to prepare content for.
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
              {periodType === "block"
                ? "Used for Medicine and Dentistry"
                : "Used for this department"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="School"
            value={context.school}
            onChange={handleContextSchoolChange}
            options={["LASU", "LASUCOM"]}
          />

          {context.school === "LASU" && (
            <Select
              label="Faculty"
              value={context.faculty}
              onChange={handleContextFacultyChange}
              options={["", ...facultyOptions]}
            />
          )}

          <Select
            label="Department"
            value={context.department}
            onChange={handleContextDepartmentChange}
            options={["", ...departmentOptions]}
          />

          <Select
            label="Level"
            value={context.level}
            onChange={(value: string) =>
              setContext((prev) => ({ ...prev, level: value }))
            }
            options={levelOptions}
          />
        </div>

        <div className="mt-5">
          <PeriodSwitcher
            title="Workspace Period"
            description="Use this for uploading and preparing content. This does not change what students see."
            periods={periods}
            selectedId={workspacePeriodId}
            liveId={livePeriodId}
            loading={loadingPeriods || savingControl}
            mode="workspace"
            onChange={handleWorkspaceSwitch}
          />
        </div>
      </div>

      <div className="mb-6 rounded-[32px] border border-green-500/10 bg-green-50/60 p-5 shadow-sm backdrop-blur-xl dark:border-green-400/10 dark:bg-green-400/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-green-700 dark:text-green-300">
              <CheckCircle2 size={14} />
              Live App Control
            </div>
            <h2 className="mt-3 text-2xl font-black text-navy dark:text-white">
              Student Access Period
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300">
              This is separate from admin workspace. Switching this controls what students can currently access in the app.
            </p>
          </div>

          <div className="min-w-0 flex-1 lg:max-w-xl">
            <PeriodSwitcher
              title="Live App Period"
              description="Only switch this when the school is ready to open that period to students."
              periods={periods}
              selectedId={livePeriodId}
              liveId={livePeriodId}
              loading={loadingPeriods || savingControl}
              mode="live"
              onChange={handleLiveSwitch}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Workspace Courses"
          value={courses.length}
          icon={BookOpen}
          color="bg-orange/10 text-orange"
        />
        <SummaryCard
          label="Current Period"
          value={workspacePeriod?.name || "--"}
          icon={Layers3}
          color="bg-blue-500/10 text-blue-500"
        />
        <SummaryCard
          label="Live App"
          value={livePeriod?.name || "--"}
          icon={CheckCircle2}
          color="bg-green-500/10 text-green-500"
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
          placeholder="Search course code, title or period..."
          className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-[28px] bg-white/70 dark:bg-white/10"
                />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-[28px] border border-orange/10 bg-white/85 p-10 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
                <BookOpen size={28} />
              </div>
              <h3 className="mt-5 text-xl font-black text-navy dark:text-white">
                No courses in this workspace yet
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
                Create a course under {context.department || "this department"} and {workspacePeriod?.name || "the selected period"}.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleCourses.map((course) => {
                  const isExpanded = expandedCourses.includes(course.id);
                  const periodName =
                    course.academic_periods?.name || course.semester || "Period";
                  const courseColor = getCourseColor(course.course_color);
                  const CourseIcon = getCourseIcon(course.course_icon);

                  return (
                    <div
                      key={course.id}
                      className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div
                            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border"
                            style={{
                              backgroundColor: courseColor.bg,
                              color: courseColor.fg,
                              borderColor: courseColor.border,
                            }}
                          >
                            <CourseIcon size={27} strokeWidth={2.6} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">
                              {periodName}
                            </p>
                            <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                              {course.code}
                            </h3>
                            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                              {course.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {course.is_shared && (
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-300">
                              Shared
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              course.status === "active"
                                ? "bg-green-500/10 text-green-600 dark:text-green-300"
                                : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                            }`}
                          >
                            {course.status || "active"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <InfoPill text={course.department || context.department} />
                        <InfoPill text={course.level || context.level} />
                        <InfoPill text={course.school || context.school} />
                      </div>

                      <button
                        onClick={() => toggleCourseDetails(course.id)}
                        className="mt-5 rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                      >
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>

                      {isExpanded && (
                        <div className="mt-4 rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            Course Information
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-2 text-sm font-bold text-slate-600 dark:text-slate-200">
                            <p>Code: {course.code}</p>
                            <p>Title: {course.title}</p>
                            <p>Period: {periodName}</p>
                            <p>Department: {course.department || "Not set"}</p>
                            {course.is_shared && (
                              <p>Original Department: {course.source_department || "Not set"}</p>
                            )}
                            <p>Level: {course.level || "Not set"}</p>
                            <p>Icon: {COURSE_ICONS.find((item) => item.value === course.course_icon)?.label || "Book"}</p>
                            <p>Color: {COURSE_COLORS.find((item) => item.value === course.course_color)?.label || "Orange"}</p>
                            <p>Status: {course.status || "active"}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => openShares(course)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-navy px-4 py-2 text-xs font-black text-white transition hover:scale-[1.03] dark:bg-white/10"
                        >
                          <Share2 size={14} />
                          {course.is_shared ? "View Access" : "Share"}
                        </button>

                        {!course.is_shared && (
                          <button
                            onClick={() => openEditCourse(course)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-soft px-4 py-2 text-xs font-black text-navy transition hover:bg-orange hover:text-white dark:bg-slate-950/50 dark:text-white dark:hover:bg-orange"
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                        )}

                        {isSuperAdmin && !course.is_shared && (
                          <button
                            onClick={() => handleDeleteCourse(course)}
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

              {filteredCourses.length > 10 && (
                <div className="mt-8 flex justify-center">
                  {hasMoreCourses ? (
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] dark:bg-white/10"
                    >
                      Show More Courses
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
        </div>

        <SharePanel
          isOpen={sharePanelOpen}
          selectedCourse={selectedCourse}
          shares={shares}
          shareForm={shareForm}
          savingShare={savingShare}
          isSuperAdmin={isSuperAdmin}
          departmentOptions={shareDepartmentOptions}
          levelOptions={shareLevelOptions}
          facultyOptions={facultyOptions}
          sharePeriods={sharePeriods}
          onClose={() => setSharePanelOpen(false)}
          onSchoolChange={handleShareSchoolChange}
          onFacultyChange={handleShareFacultyChange}
          onDepartmentChange={handleShareDepartmentChange}
          onFormChange={setShareForm}
          onCreateShare={handleCreateShare}
          onDeleteShare={handleDeleteShare}
        />
      </div>

      {courseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-2xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  {editingCourse ? "Edit Course" : "New Course"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  {editingCourse ? "Update Course" : "Create Course"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Courses are created directly under the selected department and period.
                </p>
              </div>

              <button
                onClick={() => setCourseModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ReadOnlyBox label="School" value={courseForm.school} />
              <ReadOnlyBox label="Department" value={courseForm.department} />
              <ReadOnlyBox label="Level" value={courseForm.level} />
              <ReadOnlyBox
                label={periodType === "block" ? "Block" : "Semester"}
                value={periods.find((item) => item.id === courseForm.academic_period_id)?.name || "Not selected"}
              />

              <Input
                label="Course Code"
                value={courseForm.code}
                onChange={(value: string) =>
                  setCourseForm((prev) => ({ ...prev, code: value }))
                }
              />

              <Input
                label="Course Title"
                value={courseForm.title}
                onChange={(value: string) =>
                  setCourseForm((prev) => ({ ...prev, title: value }))
                }
              />

              <Select
                label="Status"
                value={courseForm.status}
                onChange={(value: string) =>
                  setCourseForm((prev) => ({ ...prev, status: value }))
                }
                options={["active", "inactive"]}
              />

              <Select
                label="Course Icon"
                value={courseForm.course_icon}
                onChange={(value: string) =>
                  setCourseForm((prev) => ({ ...prev, course_icon: value }))
                }
                options={COURSE_ICONS.map((item) => item.value)}
                labels={Object.fromEntries(
                  COURSE_ICONS.map((item) => [item.value, item.label])
                )}
              />

              <Select
                label="Course Color"
                value={courseForm.course_color}
                onChange={(value: string) =>
                  setCourseForm((prev) => ({ ...prev, course_color: value }))
                }
                options={COURSE_COLORS.map((item) => item.value)}
                labels={Object.fromEntries(
                  COURSE_COLORS.map((item) => [item.value, item.label])
                )}
              />
            </div>

            <button
              onClick={handleSaveCourse}
              disabled={savingCourse}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
            >
              {savingCourse
                ? "Saving..."
                : editingCourse
                ? "Save Changes"
                : "Create Course"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodSwitcher({
  title,
  description,
  periods,
  selectedId,
  liveId,
  loading,
  mode,
  onChange,
}: {
  title: string;
  description: string;
  periods: AcademicPeriod[];
  selectedId: string;
  liveId: string;
  loading: boolean;
  mode: "workspace" | "live";
  onChange: (id: string) => void;
}) {
  return (
    <div className="rounded-[28px] border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/40">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-navy dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
            {description}
          </p>
        </div>

        {mode === "live" && (
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-green-600 dark:text-green-300">
            Student Access
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {periods.map((period) => {
          const active = selectedId === period.id;
          const live = liveId === period.id;

          return (
            <button
              key={period.id}
              onClick={() => onChange(period.id)}
              disabled={loading}
              className={`rounded-2xl border px-4 py-2 text-xs font-black transition ${
                active
                  ? "border-orange bg-orange text-white shadow-lg shadow-orange-500/20"
                  : "border-orange/10 bg-white/70 text-navy hover:border-orange hover:text-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
              }`}
            >
              {period.name}
              {live && mode === "workspace" ? " • Live" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SharePanel({
  isOpen,
  selectedCourse,
  shares,
  shareForm,
  savingShare,
  isSuperAdmin,
  departmentOptions,
  levelOptions,
  facultyOptions,
  sharePeriods,
  onClose,
  onSchoolChange,
  onFacultyChange,
  onDepartmentChange,
  onFormChange,
  onCreateShare,
  onDeleteShare,
}: any) {
  return (
    <div
      className={`rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${
        isOpen ? "block" : "hidden xl:block"
      }`}
    >
      {selectedCourse ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                Share Course
              </p>
              <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                {selectedCourse.code}
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                Share this course with another department without duplicating it.
              </p>
            </div>

            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white xl:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <Select
              label="School"
              value={shareForm.school}
              onChange={onSchoolChange}
              options={["LASU", "LASUCOM"]}
            />

            {shareForm.school === "LASU" && (
              <Select
                label="Faculty"
                value={shareForm.faculty}
                onChange={onFacultyChange}
                options={["", ...facultyOptions]}
              />
            )}

            <Select
              label="Department"
              value={shareForm.department}
              onChange={onDepartmentChange}
              options={["", ...departmentOptions]}
            />

            <Select
              label="Level"
              value={shareForm.level}
              onChange={(value: string) =>
                onFormChange((prev: any) => ({ ...prev, level: value, academic_period_id: "" }))
              }
              options={levelOptions}
            />

            <Select
              label="Period"
              value={shareForm.academic_period_id}
              onChange={(value: string) =>
                onFormChange((prev: any) => ({ ...prev, academic_period_id: value }))
              }
              options={["", ...sharePeriods.map((item: AcademicPeriod) => item.id)]}
              labels={{
                "": "Select Period",
                ...Object.fromEntries(sharePeriods.map((item: AcademicPeriod) => [item.id, item.name])),
              }}
            />

            <button
              onClick={onCreateShare}
              disabled={savingShare}
              className="w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
            >
              {savingShare ? "Sharing..." : "Share Course"}
            </button>
          </div>

          <div className="mt-7">
            <h4 className="text-sm font-black text-navy dark:text-white">
              Shared Departments
            </h4>

            <div className="mt-3 space-y-3">
              {shares.length === 0 ? (
                <div className="rounded-3xl bg-soft p-5 text-center dark:bg-slate-950/50">
                  <p className="text-sm font-black text-navy dark:text-white">
                    No shared departments yet
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                    Share this course when another department needs access.
                  </p>
                </div>
              ) : (
                shares.map((item: CourseShare) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/50"
                  >
                    <p className="font-black text-navy dark:text-white">
                      {item.department} • {item.level}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                      {item.school}
                      {item.faculty ? ` / ${item.faculty}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-black text-orange">
                      {item.academic_periods?.name || "Period"}
                    </p>

                    {isSuperAdmin && (
                      <button
                        onClick={() => onDeleteShare(item)}
                        className="mt-3 text-xs font-black text-red-600 transition hover:text-red-700 dark:text-red-300"
                      >
                        Remove Access
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="py-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
            <GraduationCap size={28} />
          </div>
          <h3 className="mt-5 text-xl font-black text-navy dark:text-white">
            Select a course
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Choose a course to share it with another department.
          </p>
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
      <p className="text-2xl font-black text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
        {label}
      </p>
    </div>
  );
}

function InfoPill({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-soft px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
      {text || "Not set"}
    </span>
  );
}

function ReadOnlyBox({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-orange/10 bg-soft px-4 py-3 dark:border-white/10 dark:bg-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-navy dark:text-white">
        {value || "Not set"}
      </p>
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

function Select({ label, value, onChange, options, labels }: any) {
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
        {options.map((item: string) => (
          <option key={item || "placeholder"} value={item}>
            {labels?.[item] || item || `Select ${label}`}
          </option>
        ))}
      </select>
    </label>
  );
}

