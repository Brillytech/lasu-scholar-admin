import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  GraduationCap,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { createAdminLog } from "../services/adminLogs";
import { useAdminAuth } from "../context/AuthContext";
import type { Student } from "../services/students";
import {
  getStudents,
  promoteLasucom100LevelDepartment,
} from "../services/students";

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

function isLasucom100L(student: Student) {
  return (
    student.school === "LASUCOM" &&
    (student.level === "100L" || student.level === "100 Level")
  );
}

export default function Students() {
  const { profile } = useAdminAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [promotionDepartment, setPromotionDepartment] = useState("");
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      setLoading(true);
      const data = await getStudents();
      setStudents(data);
    } catch (error: any) {
      alert(error.message || "Could not load students.");
    } finally {
      setLoading(false);
    }
  }

  const promotionStudents = useMemo(() => {
    if (!promotionDepartment) return [];

    return students.filter(
      (student) =>
        isLasucom100L(student) && student.department === promotionDepartment
    );
  }, [students, promotionDepartment]);

  async function handlePromoteDepartment() {
    if (!promotionDepartment) {
      alert("Select a LASUCOM department first.");
      return;
    }

    if (promotionStudents.length === 0) {
      alert("No LASUCOM 100L students found in this department.");
      return;
    }

    const confirmed = confirm(
      `Promote ${promotionStudents.length} ${promotionDepartment} 100L student(s) to 200L?`
    );

    if (!confirmed) return;

    try {
      setPromoting(true);

      const updated = await promoteLasucom100LevelDepartment(promotionDepartment);

      await createAdminLog({
        admin_id: profile?.id,
        action: "PROMOTE_LASUCOM_100L",
        target_table: "profiles",
        target_id: updated?.[0]?.id || "department-promotion",
        description: `Promoted ${updated.length} ${promotionDepartment} student(s) from 100L to 200L`,
      });

      await loadStudents();
      alert(`Promoted ${updated.length} student(s) to 200L.`);
    } catch (error: any) {
      alert(error.message || "Could not promote students.");
    } finally {
      setPromoting(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !q ||
        student.username?.toLowerCase().includes(q) ||
        student.email?.toLowerCase().includes(q) ||
        student.department?.toLowerCase().includes(q) ||
        student.faculty?.toLowerCase().includes(q) ||
        student.school?.toLowerCase().includes(q) ||
        student.level?.toLowerCase().includes(q);

      const matchesSchool = !schoolFilter || student.school === schoolFilter;
      const matchesLevel = !levelFilter || student.level === levelFilter;

      const matchesProfile =
        !profileFilter ||
        (profileFilter === "completed" && student.profile_completed) ||
        (profileFilter === "incomplete" && !student.profile_completed);

      return matchesSearch && matchesSchool && matchesLevel && matchesProfile;
    });
  }, [students, search, schoolFilter, levelFilter, profileFilter]);

  const visibleStudents = filteredStudents.slice(0, visibleCount);
  const hasMoreStudents = filteredStudents.length > visibleCount;
  const lasucom100Count = students.filter(isLasucom100L).length;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Student Management
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Students
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Monitor registered students, academic profiles and account completion status.
          </p>
        </div>

        <button
          onClick={loadStudents}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <ShieldCheck size={18} />
          Refresh Students
        </button>
      </div>

      <div className="mb-6 rounded-[30px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
              LASUCOM Promotion
            </p>
            <h2 className="mt-2 text-2xl font-black text-navy dark:text-white">
              100L to 200L
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300">
              Promote LASUCOM students by department when they move from Ojo phase to 200L.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[1fr_auto] xl:max-w-xl">
            <select
              value={promotionDepartment}
              onChange={(e) => setPromotionDepartment(e.target.value)}
              className="h-12 rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              <option value="">Select Department</option>
              {LASUCOM_DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <button
              onClick={handlePromoteDepartment}
              disabled={promoting || !promotionDepartment}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-60 dark:bg-white/10"
            >
              <GraduationCap size={18} />
              {promoting ? "Promoting..." : "Promote"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <MiniStat label="LASUCOM 100L" value={lasucom100Count} />
          <MiniStat
            label="Selected Dept"
            value={promotionStudents.length}
          />
          <MiniStat
            label="Destination"
            value={promotionDepartment ? "200L" : "--"}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard
          label="Total Students"
          value={students.length}
          icon={Users}
          color="bg-blue-500/10 text-blue-500"
        />
        <SummaryCard
          label="Completed"
          value={students.filter((s) => s.profile_completed).length}
          icon={CheckCircle2}
          color="bg-green-500/10 text-green-500"
        />
        <SummaryCard
          label="Incomplete"
          value={students.filter((s) => !s.profile_completed).length}
          icon={XCircle}
          color="bg-red-500/10 text-red-500"
        />
        <SummaryCard
          label="Visible"
          value={filteredStudents.length}
          icon={UserCheck}
          color="bg-orange/10 text-orange"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-4">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(50);
            }}
            placeholder="Search username, email, department..."
            className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <select
          value={schoolFilter}
          onChange={(e) => {
            setSchoolFilter(e.target.value);
            setVisibleCount(50);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Schools</option>
          <option value="LASU">LASU</option>
          <option value="LASUCOM">LASUCOM</option>
        </select>

        <select
          value={levelFilter}
          onChange={(e) => {
            setLevelFilter(e.target.value);
            setVisibleCount(50);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Levels</option>
          <option value="100L">100L</option>
          <option value="100 Level">100 Level</option>
          <option value="200L">200L</option>
          <option value="200 Level">200 Level</option>
          <option value="300L">300L</option>
          <option value="400L">400L</option>
          <option value="500L">500L</option>
          <option value="600L">600L</option>
        </select>

        <select
          value={profileFilter}
          onChange={(e) => {
            setProfileFilter(e.target.value);
            setVisibleCount(50);
          }}
          className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <option value="">All Profiles</option>
          <option value="completed">Completed</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-orange/10 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-col gap-2 border-b border-orange/10 bg-soft/80 px-5 py-4 dark:border-white/10 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-navy dark:text-white">
              Student Records
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Showing {visibleStudents.length} of {filteredStudents.length} students.
            </p>
          </div>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">
            Live Supabase Data
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
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
              <Users size={28} />
            </div>
            <h3 className="mt-5 text-xl font-black text-navy dark:text-white">
              No students found
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Try changing your filters or search keyword.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr className="border-b border-orange/10 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/10">
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">School</th>
                    <th className="px-5 py-4">Faculty</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Level</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-orange/10 transition hover:bg-soft/70 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-r from-orange to-amber-500 text-sm font-black text-white shadow-lg shadow-orange-500/20">
                            {student.username?.charAt(0)?.toUpperCase() || "S"}
                          </div>

                          <div>
                            <p className="font-black text-navy dark:text-white">
                              {student.username || "No username"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                              {student.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-navy dark:text-white">
                        {student.school || "Not set"}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {student.faculty || "Not set"}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {student.department || "Not set"}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-navy dark:text-white">
                        {student.level || "Not set"}
                      </td>

                      <td className="px-5 py-4">
                       <StatusBadge completed={!!student.profile_completed} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedStudent(student)}
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
              {visibleStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-[24px] border border-orange/10 bg-soft/80 p-4 dark:border-white/10 dark:bg-slate-950/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-r from-orange to-amber-500 text-sm font-black text-white">
                      {student.username?.charAt(0)?.toUpperCase() || "S"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-navy dark:text-white">
                        {student.username || "No username"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-300">
                        {student.email || "No email"}
                      </p>
                    </div>

                    <StatusBadge completed={!!student.profile_completed} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <MiniInfo label="School" value={student.school} />
                    <MiniInfo label="Level" value={student.level} />
                    <MiniInfo label="Faculty" value={student.faculty} />
                    <MiniInfo label="Department" value={student.department} />
                  </div>

                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange/10 px-4 py-3 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                  >
                    <Eye size={14} />
                    View Student
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {filteredStudents.length > 50 && (
        <div className="mt-8 flex justify-center">
          {hasMoreStudents ? (
            <button
              onClick={() => setVisibleCount((prev) => prev + 50)}
              className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] dark:bg-white/10"
            >
              Show More Students
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

      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-2xl rounded-[30px] border border-orange/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
                  Student Profile
                </p>
                <h3 className="mt-2 text-2xl font-black text-navy dark:text-white">
                  {selectedStudent.username || "No username"}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  {selectedStudent.email || "No email"}
                </p>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Info label="School" value={selectedStudent.school} />
              <Info label="Faculty" value={selectedStudent.faculty} />
              <Info label="Department" value={selectedStudent.department} />
              <Info label="Level" value={selectedStudent.level} />
              <Info
                label="Profile Status"
                value={
                  selectedStudent.profile_completed ? "Completed" : "Incomplete"
                }
              />
              <Info
                label="Joined"
                value={
                  selectedStudent.created_at
                    ? new Date(selectedStudent.created_at).toLocaleString()
                    : "Not available"
                }
              />
            </div>

            <div className="mt-6 rounded-3xl bg-soft p-5 dark:bg-slate-950/50">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-orange">
                Admin Actions
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                Student promotion is handled by department from the main Students page.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl bg-soft p-4 text-center dark:bg-slate-950/50">
      <p className="text-2xl font-black text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
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

function StatusBadge({ completed }: { completed: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        completed
          ? "bg-green-500/10 text-green-600 dark:text-green-300"
          : "bg-red-500/10 text-red-600 dark:text-red-300"
      }`}
    >
      {completed ? "Completed" : "Incomplete"}
    </span>
  );
}

function MiniInfo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-navy dark:text-white">
        {value || "Not set"}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-navy dark:text-white">
        {value || "Not set"}
      </p>
    </div>
  );
}
