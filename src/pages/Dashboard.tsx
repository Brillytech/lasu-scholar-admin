import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BookCheck,
  BookOpen,
  FileText,
  GraduationCap,
  Library,
  ListChecks,
  Megaphone,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getDashboardStats } from "../services/dashboard";
import type { AdminLog } from "../services/adminLogs";
import { getAdminLogs } from "../services/adminLogs";

type DashboardStats = {
  students: number;
  courses: number;
  topics: number;
  questions: number;
  materials: number;
  exams: number;
  practice: number;
  assignments: number;
  sharedCourses?: number;
  academicPeriods?: number;
  periodControls?: number;
};

const emptyStats: DashboardStats = {
  students: 0,
  courses: 0,
  topics: 0,
  questions: 0,
  materials: 0,
  exams: 0,
  practice: 0,
  assignments: 0,
  sharedCourses: 0,
  academicPeriods: 0,
  periodControls: 0,
};

export default function Dashboard() {
  const [statsData, setStatsData] = useState<DashboardStats>(emptyStats);
  const [recentLogs, setRecentLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [data, logs] = await Promise.all([
        getDashboardStats(),
        getAdminLogs(6),
      ]);

      setStatsData({
        ...emptyStats,
        ...(data as any),
      });
      setRecentLogs(logs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = [
    { label: "Students", value: statsData.students, icon: Users, color: "bg-blue-500/10 text-blue-500" },
    { label: "Courses", value: statsData.courses, icon: Library, color: "bg-orange/10 text-orange" },
    { label: "Topics", value: statsData.topics, icon: BookOpen, color: "bg-purple-500/10 text-purple-500" },
    { label: "Questions", value: statsData.questions, icon: ListChecks, color: "bg-green-500/10 text-green-500" },
    { label: "Materials", value: statsData.materials, icon: FileText, color: "bg-yellow-500/10 text-yellow-500" },
    { label: "Exam Attempts", value: statsData.exams, icon: GraduationCap, color: "bg-red-500/10 text-red-500" },
    { label: "Practice", value: statsData.practice, icon: BookCheck, color: "bg-cyan-500/10 text-cyan-500" },
    { label: "Shared Access", value: statsData.sharedCourses || statsData.assignments || 0, icon: Share2, color: "bg-indigo-500/10 text-indigo-500" },
  ];

  const quickActions = [
    { label: "Create Course", path: "/courses", icon: Library },
    { label: "Add Topic", path: "/topics", icon: BookOpen },
    { label: "Upload Questions", path: "/questions", icon: ListChecks },
    { label: "Add Material", path: "/materials", icon: FileText },
  ];

  const adminTools = [
    {
      label: "Post Notification",
      description: "Send announcements to students.",
      path: "/notifications",
      icon: Bell,
      accent: "bg-orange/10 text-orange",
    },
    {
      label: "Academic Control",
      description: "Manage workspace and live periods inside Courses.",
      path: "/courses",
      icon: ShieldCheck,
      accent: "bg-green-500/10 text-green-500",
    },
    {
      label: "Question Bank",
      description: "Create or bulk upload CBT questions.",
      path: "/questions",
      icon: ListChecks,
      accent: "bg-blue-500/10 text-blue-500",
    },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange">
            Welcome Back
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Manage content, students, notifications and performance from one clean console.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={loadDashboard}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange/10 bg-white/80 px-5 py-3 text-sm font-black text-navy shadow-sm backdrop-blur-xl transition hover:scale-[1.02] dark:border-white/10 dark:bg-white/10 dark:text-white sm:w-auto"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            to="/courses"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
          >
            <Plus size={18} />
            Add Content
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-[30px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
              CMS Control
            </p>
            <h2 className="mt-2 text-2xl font-black text-navy dark:text-white">
              LASU Scholar Console
            </h2>
            <p className="mt-1 max-w-xl text-sm font-semibold text-slate-500 dark:text-slate-300">
              Create academic content, manage access and keep students updated.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="group rounded-2xl bg-soft px-4 py-3 text-center text-xs font-black text-navy transition hover:bg-orange hover:text-white dark:bg-slate-950/50 dark:text-white dark:hover:bg-orange"
                >
                  <Icon size={17} className="mx-auto mb-2 transition group-hover:scale-110" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10 sm:p-6"
            >
              <div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${item.color}`}>
                <Icon size={22} />
              </div>

              {loading ? (
                <div className="h-9 w-20 animate-pulse rounded-xl bg-slate-100 dark:bg-white/10" />
              ) : (
                <p className="text-3xl font-black text-navy dark:text-white">
                  {item.value}
                </p>
              )}

              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-navy dark:text-white">
                Recent Activity
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
                Latest content and admin actions.
              </p>
            </div>

            <Link
              to="/admin-logs"
              className="rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
            >
              View Logs
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-3xl bg-soft dark:bg-white/10" />
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="mt-8 rounded-3xl bg-soft p-6 text-center dark:bg-slate-950/50 sm:p-8">
              <p className="font-black text-navy dark:text-white">No activity yet</p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                Start by adding courses, topics and questions.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-3xl border border-orange/10 bg-soft p-4 dark:border-white/10 dark:bg-slate-950/50"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-navy dark:text-white">
                        {log.description || log.action}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                        {log.profiles?.full_name || log.profiles?.username || log.profiles?.email || "Admin"}
                      </p>
                    </div>

                    <span className="text-xs font-black uppercase tracking-[0.12em] text-orange">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/10 bg-navy p-5 text-white shadow-xl dark:bg-white/10 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
              Admin Tools
            </p>

            <h3 className="mt-3 text-2xl font-black">Control Center</h3>

            <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
              Quick access to the major admin actions.
            </p>

            <div className="mt-5 space-y-3">
              {adminTools.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="flex items-center gap-3 rounded-3xl bg-white/10 p-4 transition hover:bg-orange"
                  >
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${item.accent}`}>
                      <Icon size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white">{item.label}</p>
                      <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/60">
                        {item.description}
                      </p>
                    </div>

                    <ArrowRight size={16} className="text-white/60" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange/10 text-orange">
                <Megaphone size={22} />
              </div>

              <div>
                <h3 className="font-black text-navy dark:text-white">
                  Notifications
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  Ready for the next update.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
              We can add admin posting for announcements, exam alerts, material updates and targeted department notifications here.
            </p>

            <Link
              to="/notifications"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange/10 px-5 py-3 text-sm font-black text-orange transition hover:bg-orange hover:text-white"
            >
              Open Notifications
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
