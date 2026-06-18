import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "../assets/ls-logo.png";

type SidebarProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const links = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Courses", path: "/courses", icon: Library },
  { name: "Topics", path: "/topics", icon: BookOpen },
  { name: "Questions", path: "/questions", icon: ListChecks },
  { name: "Materials", path: "/materials", icon: FileText },
  { name: "Students", path: "/students", icon: Users },
  { name: "Practice", path: "/practice", icon: Trophy },
  { name: "Exams", path: "/exams", icon: GraduationCap },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "Admin Logs", path: "/admin-logs", icon: Activity },
  { name: "Notifications", path: "/notifications", icon: Bell },
  { name: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar({ open, setOpen }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[82%] max-w-72 flex-col border-r border-orange/10 bg-white/90 px-4 py-5 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-950/90 sm:w-72 sm:px-5 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex shrink-0 items-start justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt="LASU Scholar"
              className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-lg shadow-orange-500/10"
            />

            <div className="min-w-0">
              <h1 className="truncate text-xl font-black leading-none text-navy dark:text-white">
                LASU Scholar
              </h1>
              <p className="mt-1 text-xs font-bold text-orange">
                Admin Console
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-soft text-navy transition hover:bg-orange hover:text-white dark:bg-white/10 dark:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-orange to-amber-500 text-white shadow-lg shadow-orange-500/25"
                      : "text-slate-600 hover:translate-x-1 hover:bg-orange/10 hover:text-navy dark:text-slate-300 dark:hover:text-white"
                  }`
                }
              >
                <Icon size={19} className="shrink-0" />
                <span className="truncate">{link.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-5 shrink-0 rounded-[24px] border border-orange/10 bg-soft/80 p-4 dark:border-white/10 dark:bg-white/10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange">
            Status
          </p>
          <p className="mt-2 text-sm font-black text-navy dark:text-white">
            Admin CMS Active
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">
            Supabase connected. Content system live.
          </p>
        </div>
      </aside>
    </>
  );
}
