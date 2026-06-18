import { useEffect, useState } from "react";
import {
  AlertCircle,
  Copy,
  Database,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { AdminRole, AdminUser } from "../services/admins";
import {
  createAdminAccount,
  getAdmins,
  removeAdmin,
} from "../services/admins";
import { createAdminLog } from "../services/adminLogs";
import { getDashboardStats } from "../services/dashboard";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  role: "admin" as AdminRole,
};

export default function Settings() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    topics: 0,
    questions: 0,
    materials: 0,
    exams: 0,
    practice: 0,
    assignments: 0,
  });

  const isSuperAdmin = currentAdmin?.role === "super_admin";

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        adminsData,
        dashboardStats,
        {
          data: { user },
        },
      ] = await Promise.all([
        getAdmins(),
        getDashboardStats(),
        supabase.auth.getUser(),
      ]);

      setAdmins(adminsData);
      setStats(dashboardStats as any);

      if (user) {
        const foundAdmin = adminsData.find((admin) => admin.id === user.id);

        setCurrentAdmin(
          foundAdmin || {
            id: user.id,
            email: user.email || null,
            username: user.user_metadata?.username || null,
            full_name: user.user_metadata?.full_name || null,
            role: user.user_metadata?.role || "admin",
            created_at: user.created_at,
          }
        );
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdmin() {
    setMessage("");
    setErrorMessage("");

    if (!isSuperAdmin) {
      setErrorMessage("Only super admins can create admin accounts.");
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage("Admin email is required.");
      return;
    }

    if (!form.email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!form.password || form.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      setSaving(true);

      const createdAdmin = await createAdminAccount({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      await createAdminLog({
        admin_id: currentAdmin?.id,
        action: "CREATE_ADMIN_ACCOUNT",
        target_table: "profiles",
        target_id: createdAdmin.id,
        description: `${currentAdmin?.email || "Admin"} created ${form.role} account for ${createdAdmin.email}`,
      });

      setForm(emptyForm);
      setMessage("Admin account created successfully.");
      await loadSettings();
    } catch (error: any) {
      setErrorMessage(
        error.message ||
          "Could not create admin. You can still add admins manually from Supabase Auth and profiles table."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveAdmin(admin: AdminUser) {
    setMessage("");
    setErrorMessage("");

    if (!isSuperAdmin) {
      setErrorMessage("Only super admins can remove admin access.");
      return;
    }

    if (admin.id === currentAdmin?.id) {
      setErrorMessage("You cannot remove your own admin access.");
      return;
    }

    const confirmed = confirm(
      `Remove admin access for ${admin.email || admin.full_name}?`
    );

    if (!confirmed) return;

    try {
      await removeAdmin(admin.id);

      await createAdminLog({
        admin_id: currentAdmin?.id,
        action: "REMOVE_ADMIN_ACCESS",
        target_table: "profiles",
        target_id: admin.id,
        description: `${currentAdmin?.email || "Admin"} removed admin access for ${admin.email}`,
      });

      setMessage("Admin access removed successfully.");
      await loadSettings();
    } catch (error: any) {
      setErrorMessage(error.message || "Could not remove admin.");
    }
  }

  async function copyManualSql() {
    if (!form.email.trim()) {
      setErrorMessage("Enter the admin email first before copying SQL.");
      return;
    }

    const cleanEmail = form.email.trim().toLowerCase();

    const sql = `-- First create the user in Supabase Auth manually.
-- Then run this only after the user exists in profiles.
update profiles
set role = '${form.role}'
where lower(email) = '${cleanEmail}';`;

    try {
      setCopying(true);
      await navigator.clipboard.writeText(sql);
      setMessage("Manual SQL copied.");
    } catch {
      setErrorMessage("Could not copy SQL.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            System Settings
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Manage dashboard admins, access roles, system health and Supabase status.
          </p>
        </div>

        <button
          onClick={loadSettings}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh Settings
        </button>
      </div>

      {message && (
        <div className="mb-5 rounded-2xl border border-green-500/10 bg-green-500/10 p-4 text-sm font-black text-green-700 dark:text-green-300">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-500/10 bg-red-500/10 p-4 text-sm font-black text-red-600 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy text-white dark:bg-white/10">
                <UserRound size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-navy dark:text-white">
                  Current Admin
                </h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Logged-in dashboard administrator.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoBox
                label="Admin"
                value={
                  currentAdmin?.full_name ||
                  currentAdmin?.username ||
                  currentAdmin?.email ||
                  "Unknown"
                }
              />
              <InfoBox label="Email" value={currentAdmin?.email || "Unknown"} />
              <InfoBox
                label="Role"
                value={
                  currentAdmin?.role === "super_admin"
                    ? "Super Admin"
                    : "Admin"
                }
              />
              <InfoBox
                label="Access"
                value={isSuperAdmin ? "Full System Access" : "Content Access"}
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange/10 text-orange">
                <Users size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-navy dark:text-white">
                  Admin Management
                </h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Super admins can create accounts, review admins and remove access.
                </p>
              </div>
            </div>

            {!isSuperAdmin && (
              <div className="mb-5 rounded-3xl border border-orange/10 bg-orange/10 p-4 text-sm font-bold leading-6 text-orange">
                Admin management is locked for your role. Only super admins can add or remove dashboard admins.
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <input
                value={form.full_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Full name"
                disabled={!isSuperAdmin}
                className="h-12 rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
              />

              <input
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="admin@email.com"
                disabled={!isSuperAdmin}
                className="h-12 rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
              />

              <input
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Password"
                type="password"
                disabled={!isSuperAdmin}
                className="h-12 rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
              />

              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as AdminRole,
                  }))
                }
                disabled={!isSuperAdmin}
                className="h-12 rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={handleAddAdmin}
                disabled={saving || !isSuperAdmin}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {saving ? "Creating Admin..." : "Add Admin"}
              </button>

              <button
                onClick={copyManualSql}
                disabled={copying || !isSuperAdmin}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange/10 bg-soft px-5 py-3 text-sm font-black text-navy transition hover:bg-orange hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-orange"
              >
                <Copy size={18} />
                {copying ? "Copying..." : "Copy Manual SQL"}
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 shrink-0 text-orange" size={18} />
                <div>
                  <p className="text-sm font-black text-navy dark:text-white">
                    Manual fallback
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                    If Edge Function admin creation fails, create the user in Supabase Auth manually,
                    then update the same email in the profiles table to role admin or super_admin.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-[24px] border border-orange/10 dark:border-white/10">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-soft text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
                  <tr>
                    <th className="p-4">Admin</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center font-bold text-slate-500 dark:text-slate-300"
                      >
                        Loading admins...
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center font-bold text-slate-500 dark:text-slate-300"
                      >
                        No admins found.
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr
                        key={admin.id}
                        className="border-t border-orange/10 bg-white/60 transition hover:bg-soft dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5"
                      >
                        <td className="p-4 font-black text-navy dark:text-white">
                          {admin.full_name || admin.username || "Admin"}
                        </td>
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                          {admin.email}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              admin.role === "super_admin"
                                ? "bg-orange/10 text-orange"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                            }`}
                          >
                            {admin.role === "super_admin"
                              ? "Super Admin"
                              : "Admin"}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                          {admin.created_at
                            ? new Date(admin.created_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleRemoveAdmin(admin)}
                            disabled={
                              !isSuperAdmin || admin.id === currentAdmin?.id
                            }
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-300"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-white/10 bg-navy p-6 text-white shadow-xl dark:bg-white/10">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-orange/10 text-orange">
              <ShieldCheck size={22} />
            </div>

            <h2 className="text-2xl font-black">Admin Access Active</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
              Dashboard access is protected by Supabase Auth and profile role checks.
            </p>

            <div className="mt-5 rounded-3xl bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                Permission Rule
              </p>
              <p className="mt-2 text-sm font-black text-white">
                {isSuperAdmin
                  ? "You can manage admins and delete critical data."
                  : "You can manage content, but critical actions are restricted."}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange/10 text-orange">
                <Database size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-navy dark:text-white">
                  System Status
                </h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Live Supabase data.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <StatusBox label="Students" value={stats.students} />
              <StatusBox label="Courses" value={stats.courses} />
              <StatusBox label="Assignments" value={stats.assignments || 0} />
              <StatusBox label="Topics" value={stats.topics} />
              <StatusBox label="Questions" value={stats.questions} />
              <StatusBox label="Materials" value={stats.materials} />
              <StatusBox label="Practice Attempts" value={stats.practice} />
              <StatusBox label="Exam Attempts" value={stats.exams} />
            </div>
          </section>

          <section className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange/10 text-orange">
                <KeyRound size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-navy dark:text-white">
                  Role Guide
                </h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                  How dashboard permissions work.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <RoleBox
                title="Super Admin"
                text="Can manage admins, delete content, remove course assignments and control critical settings."
              />
              <RoleBox
                title="Admin"
                text="Can create and edit content, but cannot delete critical data or manage dashboard admins."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-navy dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="text-xl font-black text-navy dark:text-white">{value}</p>
    </div>
  );
}

function RoleBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl bg-soft p-4 dark:bg-slate-950/50">
      <p className="text-sm font-black text-navy dark:text-white">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}
