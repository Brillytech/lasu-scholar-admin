import { useEffect, useMemo, useState } from "react";
import { Activity, Database, Search, ShieldCheck, UserRound } from "lucide-react";
import type { AdminLog } from "../services/adminLogs";
import { getAdminLogs } from "../services/adminLogs";

export default function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      const data = await getAdminLogs(200);
      setLogs(data);
    } catch (error: any) {
      alert(error.message || "Could not load admin logs.");
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((log) => {
      return (
        log.action?.toLowerCase().includes(q) ||
        log.description?.toLowerCase().includes(q) ||
        log.target_table?.toLowerCase().includes(q) ||
        log.profiles?.email?.toLowerCase().includes(q) ||
        log.profiles?.username?.toLowerCase().includes(q) ||
        log.profiles?.full_name?.toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  const visibleLogs = filteredLogs.slice(0, visibleCount);
  const hasMore = filteredLogs.length > visibleCount;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange">
            Audit Trail
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Admin Logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300 sm:text-base">
            Track who created, updated, deleted or assigned content across the admin dashboard.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange to-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] sm:w-auto"
        >
          <Activity size={18} />
          Refresh Logs
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total Logs" value={logs.length} icon={Database} color="bg-orange/10 text-orange" />
        <SummaryCard label="Visible" value={filteredLogs.length} icon={Search} color="bg-blue-500/10 text-blue-500" />
        <SummaryCard label="Security" value="Active" icon={ShieldCheck} color="bg-green-500/10 text-green-500" />
      </div>

      <div className="mb-6 flex h-12 items-center gap-3 rounded-2xl border border-orange/10 bg-white/85 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(50);
          }}
          placeholder="Search action, admin, table, description..."
          className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-slate-400 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-orange/10 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="border-b border-orange/10 bg-soft/80 px-5 py-4 dark:border-white/10 dark:bg-slate-950/40">
          <h3 className="text-lg font-black text-navy dark:text-white">Activity History</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Showing {visibleLogs.length} of {filteredLogs.length} logs.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-3xl bg-soft dark:bg-white/10" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange/10 text-orange">
              <Activity size={28} />
            </div>
            <h3 className="mt-5 text-xl font-black text-navy dark:text-white">No logs found</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Admin activity will appear here once actions are performed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-orange/10 dark:divide-white/10">
            {visibleLogs.map((log) => (
              <div key={log.id} className="p-5 transition hover:bg-soft/70 dark:hover:bg-white/5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-r from-orange to-amber-500 text-white shadow-lg shadow-orange-500/20">
                      <UserRound size={18} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-black text-orange">
                          {formatAction(log.action)}
                        </span>
                        {log.target_table && (
                          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-300">
                            {log.target_table}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 font-black text-navy dark:text-white">
                        {log.description || "No description"}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                        By {log.profiles?.full_name || log.profiles?.username || log.profiles?.email || "Unknown admin"}
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-slate-500 dark:text-slate-300">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredLogs.length > 50 && (
        <div className="mt-8 flex justify-center">
          {hasMore ? (
            <button
              onClick={() => setVisibleCount((prev) => prev + 50)}
              className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] dark:bg-white/10"
            >
              Show More Logs
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
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-[28px] border border-orange/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10">
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl ${color}`}>
        <Icon size={21} />
      </div>
      <p className="text-3xl font-black text-navy dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}

function formatAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase();
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}
