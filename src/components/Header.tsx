import { useEffect, useState } from "react";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { getUnreadNotificationsCount } from "../services/notifications";

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 30000);
    return () => window.clearInterval(interval);
  }, []);

  async function loadUnreadCount() {
    try {
      const count = await getUnreadNotificationsCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-orange/10 bg-white/75 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-navy shadow-sm backdrop-blur-xl dark:bg-white/10 dark:text-white lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange sm:text-xs">
              Admin Dashboard
            </p>
            <h2 className="mt-1 truncate text-xl font-black text-navy dark:text-white sm:text-2xl">
              Content Management
            </h2>
          </div>
        </div>

        <div className="hidden h-11 w-72 items-center gap-3 rounded-2xl border border-orange/10 bg-white/80 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 md:flex xl:w-96">
          <Search size={18} className="text-slate-400" />
          <input
            placeholder="Search courses, students, questions..."
            className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-navy shadow-sm backdrop-blur-xl transition hover:scale-105 dark:bg-white/10 dark:text-white"
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <Link
            to="/notifications"
            className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-navy shadow-sm backdrop-blur-xl transition hover:scale-105 dark:bg-white/10 dark:text-white"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[10px] font-black text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-r from-orange to-amber-500 text-sm font-black text-white shadow-lg shadow-orange-500/20">
            A
          </div>
        </div>
      </div>

      <div className="mt-4 flex h-11 items-center gap-3 rounded-2xl border border-orange/10 bg-white/80 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 md:hidden">
        <Search size={18} className="text-slate-400" />
        <input
          placeholder="Search..."
          className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
        />
      </div>
    </header>
  );
}
