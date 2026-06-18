import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Search } from "lucide-react";
import type { Notification } from "../services/notifications";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notifications";

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await getNotifications(100);
      setNotifications(data);
    } catch (error: any) {
      alert(error.message || "Could not load notifications.");
    } finally {
      setLoading(false);
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

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q);

      const matchesFilter =
        !filter ||
        (filter === "unread" && !item.is_read) ||
        (filter === "read" && item.is_read);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, search, filter]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

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
            Review important dashboard alerts, student activity and system updates.
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total" value={notifications.length} />
        <SummaryCard label="Unread" value={unreadCount} />
        <SummaryCard label="Visible" value={filteredNotifications.length} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
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
          <option value="">All Notifications</option>
          <option value="unread">Unread Only</option>
          <option value="read">Read Only</option>
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
              New notifications will appear here.
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
                      <Bell size={18} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-navy dark:text-white">{item.title}</p>
                        {!item.is_read && (
                          <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-black text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                        {item.message || "No message"}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!item.is_read && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      className="rounded-2xl bg-orange/10 px-4 py-2 text-xs font-black text-orange transition hover:bg-orange hover:text-white"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <p className="text-3xl font-black text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}
