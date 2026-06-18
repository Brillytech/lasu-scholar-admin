import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useAdminAuth } from "../context/AuthContext";
import { createAdminLog } from "../services/adminLogs";
import type { Course, CourseAssignment } from "../services/courses";
import {
  createCourse,
  createCourseAssignment,
  deleteCourse,
  deleteCourseAssignment,
  getCourseAssignments,
  getCourses,
  updateCourse,
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

const emptyCourseForm = {
  code: "",
  title: "",
  semester: "First Semester",
  status: "active",
};

const emptyAssignmentForm = {
  school: "LASU",
  faculty: "",
  department: "",
  level: "100L",
};

export default function Courses() {
  const { profile } = useAdminAuth();
  const isSuperAdmin = profile?.role === "super_admin";

  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [assignmentPanelOpen, setAssignmentPanelOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);

  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);

  const facultyOptions = Object.keys(LASU_DATA);

  const departmentOptions =
    assignmentForm.school === "LASUCOM"
      ? LASUCOM_DEPARTMENTS
      : assignmentForm.faculty
      ? LASU_DATA[assignmentForm.faculty] || []
      : [];

  const levelOptions =
    assignmentForm.school === "LASUCOM" ? ["200L"] : ["100L", "200L"];

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);

    try {
      const data = await getCourses();
      setCourses(data);
    } catch (error: any) {
      alert(error.message || "Could not load courses.");
    } finally {
      setLoading(false);
    }
  }

  function toggleCourseDetails(id: string) {
    setExpandedCourses((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function openAssignments(course: Course) {
    setSelectedCourse(course);
    setAssignmentPanelOpen(true);

    try {
      const data = await getCourseAssignments(course.id);
      setAssignments(data);
    } catch (error: any) {
      alert(error.message || "Could not load course assignments.");
    }
  }

  function openCreateCourse() {
    setEditingCourse(null);
    setCourseForm(emptyCourseForm);
    setCourseModalOpen(true);
  }

  function openEditCourse(course: Course) {
    setEditingCourse(course);
    setCourseForm({
      code: course.code || "",
      title: course.title || "",
      semester: course.semester || "First Semester",
      status: course.status || "active",
    });
    setCourseModalOpen(true);
  }

  function handleSchoolChange(value: string) {
    if (value === "LASUCOM") {
      setAssignmentForm({
        school: "LASUCOM",
        faculty: "College of Medicine",
        department: "",
        level: "200L",
      });
      return;
    }

    setAssignmentForm({
      school: "LASU",
      faculty: "",
      department: "",
      level: "100L",
    });
  }

  function handleFacultyChange(value: string) {
    setAssignmentForm((prev) => ({
      ...prev,
      faculty: value,
      department: "",
    }));
  }

  async function handleSaveCourse() {
    if (!courseForm.code.trim() || !courseForm.title.trim()) {
      alert("Course code and title are required.");
      return;
    }

    try {
      setSavingCourse(true);

      if (editingCourse) {
        const updated = await updateCourse(editingCourse.id, {
          code: courseForm.code.trim().toUpperCase(),
          title: courseForm.title.trim(),
          semester: courseForm.semester,
          status: courseForm.status,
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
          semester: courseForm.semester,
          status: courseForm.status,
        });

        await createAdminLog({
          admin_id: profile?.id,
          action: "CREATE_COURSE",
          target_table: "courses",
          target_id: created.id,
          description: `Created course ${created.code} - ${created.title}`,
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
      `Delete ${course.code}? This will also remove its assignments.`
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
        setAssignmentPanelOpen(false);
        setAssignments([]);
      }

      await loadCourses();
    } catch (error: any) {
      alert(error.message || "Could not delete course.");
    }
  }

  async function handleCreateAssignment() {
    if (!selectedCourse) return;

    const faculty =
      assignmentForm.school === "LASUCOM"
        ? "College of Medicine"
        : assignmentForm.faculty.trim();

    if (
      !assignmentForm.school.trim() ||
      !faculty ||
      !assignmentForm.department.trim() ||
      !assignmentForm.level.trim()
    ) {
      alert("Please select school, faculty/department and level.");
      return;
    }

    try {
      setSavingAssignment(true);

      const createdAssignment = await createCourseAssignment({
        course_id: selectedCourse.id,
        school: assignmentForm.school.trim(),
        faculty,
        department: assignmentForm.department.trim(),
        level: assignmentForm.level.trim(),
      });

      await createAdminLog({
        admin_id: profile?.id,
        action: "CREATE_COURSE_ASSIGNMENT",
        target_table: "course_assignments",
        target_id: createdAssignment.id,
        description: `Assigned ${selectedCourse.code} to ${createdAssignment.department} ${createdAssignment.level}`,
      });

      setAssignmentForm(emptyAssignmentForm);

      const data = await getCourseAssignments(selectedCourse.id);
      setAssignments(data);
    } catch (error: any) {
      alert(error.message || "Could not assign course.");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function handleDeleteAssignment(assignment: CourseAssignment) {
    if (!isSuperAdmin) {
      alert("Only super admins can remove course assignments.");
      return;
    }

    const confirmed = confirm(
      `Remove ${assignment.department} ${assignment.level} assignment?`
    );

    if (!confirmed) return;

    try {
      await deleteCourseAssignment(assignment.id);

      await createAdminLog({
        admin_id: profile?.id,
        action: "DELETE_COURSE_ASSIGNMENT",
        target_table: "course_assignments",
        target_id: assignment.id,
        description: `Removed ${selectedCourse?.code || "course"} assignment from ${assignment.department} ${assignment.level}`,
      });

      if (selectedCourse) {
        const data = await getCourseAssignments(selectedCourse.id);
        setAssignments(data);
      }
    } catch (error: any) {
      alert(error.message || "Could not remove assignment.");
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
        course.status?.toLowerCase().includes(q)
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
            Create courses once, then assign them to schools, departments and levels.
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Courses"
          value={courses.length}
          icon={BookOpen}
          color="bg-orange/10 text-orange"
        />
        <SummaryCard
          label="Selected Assignments"
          value={assignments.length}
          icon={GraduationCap}
          color="bg-blue-500/10 text-blue-500"
        />
        <SummaryCard
          label="Active Courses"
          value={courses.filter((c) => c.status === "active").length}
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
          placeholder="Search course code, title, semester..."
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
                No courses yet
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
                Create your first course to begin building LASU Scholar content.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleCourses.map((course) => {
                  const isExpanded = expandedCourses.includes(course.id);

                  return (
                    <div
                      key={course.id}
                      className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">
                            {course.semester || "Semester"}
                          </p>
                          <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                            {course.code}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                            {course.title}
                          </p>
                        </div>

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
                            <p>Semester: {course.semester || "Not set"}</p>
                            <p>Status: {course.status || "active"}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => openAssignments(course)}
                          className="rounded-2xl bg-navy px-4 py-2 text-xs font-black text-white transition hover:scale-[1.03] dark:bg-white/10"
                        >
                          Assign
                        </button>

                        <button
                          onClick={() => openEditCourse(course)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-soft px-4 py-2 text-xs font-black text-navy transition hover:bg-orange hover:text-white dark:bg-slate-950/50 dark:text-white dark:hover:bg-orange"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        {isSuperAdmin && (
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

        <div
          className={`rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 ${
            assignmentPanelOpen ? "block" : "hidden xl:block"
          }`}
        >
          {selectedCourse ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                    Assign Course
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                    {selectedCourse.code}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                    {selectedCourse.title}
                  </p>
                </div>

                <button
                  onClick={() => setAssignmentPanelOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white xl:hidden"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <Select
                  label="School"
                  value={assignmentForm.school}
                  onChange={handleSchoolChange}
                  options={["LASU", "LASUCOM"]}
                />

                {assignmentForm.school === "LASU" && (
                  <Select
                    label="Faculty"
                    value={assignmentForm.faculty}
                    onChange={handleFacultyChange}
                    options={["", ...facultyOptions]}
                  />
                )}

                <Select
                  label="Department"
                  value={assignmentForm.department}
                  onChange={(value: string) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      department: value,
                    }))
                  }
                  options={["", ...departmentOptions]}
                />

                <Select
                  label="Level"
                  value={assignmentForm.level}
                  onChange={(value: string) =>
                    setAssignmentForm((prev) => ({ ...prev, level: value }))
                  }
                  options={levelOptions}
                />

                <button
                  onClick={handleCreateAssignment}
                  disabled={savingAssignment}
                  className="w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {savingAssignment ? "Assigning..." : "Assign Course"}
                </button>
              </div>

              <div className="mt-7">
                <h4 className="text-sm font-black text-navy dark:text-white">
                  Current Assignments
                </h4>

                <div className="mt-3 space-y-3">
                  {assignments.length === 0 ? (
                    <div className="rounded-3xl bg-soft p-5 text-center dark:bg-slate-950/50">
                      <p className="text-sm font-black text-navy dark:text-white">
                        No assignments yet
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                        Assign this course to a department and level.
                      </p>
                    </div>
                  ) : (
                    assignments.map((item) => (
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

                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteAssignment(item)}
                            className="mt-3 text-xs font-black text-red-600 transition hover:text-red-700 dark:text-red-300"
                          >
                            Remove Assignment
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
                Choose a course to assign it to departments and levels.
              </p>
            </div>
          )}
        </div>
      </div>

      {courseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-lg rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  {editingCourse ? "Edit Course" : "New Course"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  {editingCourse ? "Update Course" : "Create Course"}
                </h3>
              </div>

              <button
                onClick={() => setCourseModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
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
                label="Semester"
                value={courseForm.semester}
                onChange={(value: string) =>
                  setCourseForm((prev) => ({ ...prev, semester: value }))
                }
                options={["First Semester", "Second Semester", "Full Year"]}
              />

              <Select
                label="Status"
                value={courseForm.status}
                onChange={(value: string) =>
                  setCourseForm((prev) => ({ ...prev, status: value }))
                }
                options={["active", "inactive"]}
              />

              <button
                onClick={handleSaveCourse}
                disabled={savingCourse}
                className="w-full rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
              >
                {savingCourse
                  ? "Saving..."
                  : editingCourse
                  ? "Save Changes"
                  : "Create Course"}
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
        {options.map((item: string) => (
          <option key={item || "placeholder"} value={item}>
            {item || `Select ${label}`}
          </option>
        ))}
      </select>
    </label>
  );
}
