import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Megaphone,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useAdminAuth } from "../context/AuthContext";
import { createAdminLog } from "../services/adminLogs";
import type { Notification } from "../services/notifications";
import {
  createNotification,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notifications";

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

const levelOptions = ["100L", "200L", "300L", "400L", "500L", "600L"];

const emptyForm = {
  title: "",
  message: "",
  type: "announcement",
  audience: "all",
  target_school: "",
  target_faculty: "",
  target_department: "",
  target_level: "",
  priority: "normal",
  action_url: "",
  expires_at: "",
};

const notificationTypes = [
  { label: "Announcement", value: "announcement" },
  { label: "Exam", value: "exam" },
  { label: "Material", value: "material" },
  { label: "Practice", value: "practice" },
  { label: "Review", value: "review" },
  { label: "System", value: "system" },
];

const audienceOptions = [
  { label: "All Students", value: "all" },
  { label: "School", value: "school" },
  { label: "Faculty", value: "faculty" },
  { label: "Department", value: "department" },
  { label: "Level", value: "level" },
  { label: "Admins", value: "admin" },
];

const priorityOptions = [
  { label: "Normal", value: "normal" },
  { label: "Important", value: "important" },
  { label: "Urgent", value: "urgent" },
];

function getFacultyOptions(school: string) {
  if (school !== "LASU") return ["College of Medicine"];
  return Object.keys(LASU_DATA);
}

function getDepartmentOptions(school: string, faculty: string) {
  if (school === "LASUCOM") return LASUCOM_DEPARTMENTS;
  if (!faculty) return [];
  return LASU_DATA[faculty] || [];
}

export default function Notifications() {
  const { profile } = useAdminAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const facultyOptions = getFacultyOptions(form.target_school);
  const departmentOptions = getDepartmentOptions(form.target_school, form.target_faculty);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await getNotifications(150);
      setNotifications(data);
    } catch (error: any) {
      alert(error.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  function resetTargets(audience: string) {
    if (audience === "all" || audience === "admin") {
      return {
        target_school: "",
        target_faculty: "",
        target_department: "",
        target_level: "",
      };
    }

    return {};
  }

  function handleSchoolChange(value: string) {
    setForm((prev) => ({
      ...prev,
      target_school: value,
      target_faculty: value === "LASUCOM" ? "College of Medicine" : "",
      target_department: "",
      target_level: "",
    }));
  }

  function handleFacultyChange(value: string) {
    setForm((prev) => ({
      ...prev,
      target_faculty: value,
      target_department: "",
      target_level: "",
    }));
  }

  function handleDepartmentChange(value: string) {
    setForm((prev) => ({
      ...prev,
      target_department: value,
      target_level: "",
    }));
  }

  async function handlePostNotification() {
    if (!form.title.trim() || !form.message.trim()) {
      alert("Title and message are required.");
      return;
    }

    if (
      (form.audience === "school" ||
        form.audience === "faculty" ||
        form.audience === "department" ||
        form.audience === "level") &&
      !form.target_school
    ) {
      alert("Select the school target.");
      return;
    }

    if (
      (form.audience === "faculty" ||
        form.audience === "department" ||
        form.audience === "level") &&
      form.target_school === "LASU" &&
      !form.target_faculty
    ) {
      alert("Select the faculty target.");
      return;
    }

    if (
      (form.audience === "department" || form.audience === "level") &&
      !form.target_department
    ) {
      alert("Select the department target.");
      return;
    }

    if (form.audience === "level" && !form.target_level) {
      alert("Select the level target.");
      return;
    }

    try {
      setPosting(true);

      const created = await createNotification({
        title: form.title,
        message: form.message,
        type: form.type,
        audience: form.audience as any,
        target_role: form.audience === "admin" ? "admin" : "student",
        target_school: form.target_school,
        target_faculty: form.target_faculty,
        target_department: form.target_department,
        target_level: form.target_level,
        priority: form.priority as any,
        action_url: form.action_url,
        expires_at: form.expires_at,
      });

      await createAdminLog({
        admin_id: profile?.id,
        action: "CREATE_NOTIFICATION",
        target_table: "notifications",
        target_id: created.id,
        description: `Posted notification: ${created.title}`,
      });

      setForm(emptyForm);
      await loadNotifications();
    } catch (error: any) {
      alert(error.message || "Could not post notification.");
    } finally {
      setPosting(false);
    }
  }

  async function handleMarkRead(id: string) {
    await markNotificationAsRead(id);
    await loadNotifications();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsAsRead();
    await loadNotifications();
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Delete this notification?");

    if (!confirmed) return;

    await deleteNotification(id);
    await loadNotifications();
  }

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q) ||
        item.target_school?.toLowerCase().includes(q) ||
        item.target_faculty?.toLowerCase().includes(q) ||
        item.target_department?.toLowerCase().includes(q) ||
        item.target_level?.toLowerCase().includes(q);

      const matchesFilter =
        !filter ||
        (filter === "unread" && !item.is_read) ||
        (filter === "read" && item.is_read) ||
        (filter === "student" && item.target_role !== "admin") ||
        (filter === "admin" && item.target_role === "admin");

      const matchesSource = !sourceFilter || item.source === sourceFilter;

      return matchesSearch && matchesFilter && matchesSource;
    });
  }, [notifications, search, filter, sourceFilter]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const adminCount = notifications.filter((item) => item.target_role === "admin").length;
  const postedCount = notifications.filter((item) => item.source === "admin").length;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Notification Center
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Notifications
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Publish notices and track admin/system alerts.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <CheckCheck size={18} />
          Mark All Read
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard label="Total" value={notifications.length} />
        <SummaryCard label="Unread" value={unreadCount} />
        <SummaryCard label="Admin Alerts" value={adminCount} />
        <SummaryCard label="Posted" value={postedCount} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-[30px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange/10 text-orange">
              <Send size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-navy dark:text-white">
                Post Notice
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                Send a targeted update.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Title"
              value={form.title}
              onChange={(value: string) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
            />

            <Textarea
              label="Message"
              value={form.message}
              onChange={(value: string) =>
                setForm((prev) => ({ ...prev, message: value }))
              }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Type"
                value={form.type}
                onChange={(value: string) =>
                  setForm((prev) => ({ ...prev, type: value }))
                }
                options={notificationTypes}
              />

              <Select
                label="Priority"
                value={form.priority}
                onChange={(value: string) =>
                  setForm((prev) => ({ ...prev, priority: value }))
                }
                options={priorityOptions}
              />
            </div>

            <Select
              label="Audience"
              value={form.audience}
              onChange={(value: string) =>
                setForm((prev) => ({
                  ...prev,
                  audience: value,
                  ...resetTargets(value),
                }))
              }
              options={audienceOptions}
            />

            {(form.audience === "school" ||
              form.audience === "faculty" ||
              form.audience === "department" ||
              form.audience === "level") && (
              <Select
                label="School"
                value={form.target_school}
                onChange={handleSchoolChange}
                options={[
                  { label: "Select School", value: "" },
                  { label: "LASU", value: "LASU" },
                  { label: "LASUCOM", value: "LASUCOM" },
                ]}
              />
            )}

            {(form.audience === "faculty" ||
              form.audience === "department" ||
              form.audience === "level") &&
              form.target_school && (
                <Select
                  label="Faculty"
                  value={form.target_faculty}
                  onChange={handleFacultyChange}
                  options={[
                    { label: "Select Faculty", value: "" },
                    ...facultyOptions.map((item) => ({
                      label: item,
                      value: item,
                    })),
                  ]}
                />
              )}

            {(form.audience === "department" || form.audience === "level") &&
              form.target_school &&
              (form.target_school === "LASUCOM" || form.target_faculty) && (
                <Select
                  label="Department"
                  value={form.target_department}
                  onChange={handleDepartmentChange}
                  options={[
                    { label: "Select Department", value: "" },
                    ...departmentOptions.map((item) => ({
                      label: item,
                      value: item,
                    })),
                  ]}
                />
              )}

            {form.audience === "level" && form.target_department && (
              <Select
                label="Level"
                value={form.target_level}
                onChange={(value: string) =>
                  setForm((prev) => ({ ...prev, target_level: value }))
                }
                options={[
                  { label: "Select Level", value: "" },
                  ...levelOptions.map((item) => ({
                    label: item,
                    value: item,
                  })),
                ]}
              />
            )}

            <Input
              label="Action Link"
              value={form.action_url}
              onChange={(value: string) =>
                setForm((prev) => ({ ...prev, action_url: value }))
              }
            />

            <button
              onClick={handlePostNotification}
              disabled={posting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:opacity-60"
            >
              <Plus size={18} />
              {posting ? "Posting..." : "Post Notification"}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 lg:col-span-2">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              <option value="">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="student">Student Notices</option>
              <option value="admin">Admin Alerts</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-12 rounded-2xl border border-orange/10 bg-white/85 px-4 text-sm font-bold text-navy shadow-sm outline-none backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              <option value="">All Sources</option>
              <option value="admin">Posted</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-orange/10 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-3xl bg-soft dark:bg-white/10" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
                  <Bell size={28} />
                </div>
                <h3 className="mt-5 text-xl font-black text-navy dark:text-white">No notifications</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Nothing to show here yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-orange/10 dark:divide-white/10">
                {filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-5 transition hover:bg-soft/70 dark:hover:bg-white/5 ${
                      !item.is_read ? "bg-orange/5" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange/10 text-orange">
                          {item.source === "admin" ? <Megaphone size={18} /> : <Bell size={18} />}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-navy dark:text-white">{item.title}</p>

                            {!item.is_read && (
                              <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-black text-white">
                                NEW
                              </span>
                            )}

                            <Badge text={item.type || "notice"} />
                            <PriorityBadge priority={item.priority || "normal"} />
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                            {item.message || "No message"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-400">
                            <span>{item.source === "admin" ? "Posted" : "System"}</span>
                            <span>•</span>
                            <span>{formatAudience(item)}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {!item.is_read && (
                          <button
                            onClick={() => handleMarkRead(item.id)}
                            className="rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                          >
                            Mark Read
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAudience(item: Notification) {
  if (item.target_role === "admin") return "Admins";

  if (item.audience === "level") {
    return [item.target_department, item.target_level].filter(Boolean).join(" • ") || "Level";
  }

  if (item.audience === "department") {
    return item.target_department || "Department";
  }

  if (item.audience === "faculty") {
    return item.target_faculty || "Faculty";
  }

  if (item.audience === "school") {
    return item.target_school || "School";
  }

  return "All students";
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <p className="text-3xl font-black text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
      {text}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const urgent = priority === "urgent";
  const important = priority === "important";

  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
        urgent
          ? "bg-red-500/10 text-red-600 dark:text-red-300"
          : important
          ? "bg-orange/10 text-orange"
          : "bg-green-500/10 text-green-600 dark:text-green-300"
      }`}
    >
      {priority}
    </span>
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
        {options.map((item: any) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
