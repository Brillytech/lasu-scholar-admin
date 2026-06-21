import { useEffect, useMemo, useState } from "react";
import type { AppReview } from "../services/reviews";
import {
  deleteAppReview,
  getAppReviews,
  updateReviewStatus,
} from "../services/reviews";

type FilterStatus = "pending" | "approved" | "rejected" | "all";

const filters: { label: string; value: FilterStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status: AppReview["status"]) {
  if (status === "approved") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "rejected") {
    return "border-red-500/25 bg-red-500/10 text-red-300";
  }

  return "border-orange-500/25 bg-orange-500/10 text-orange-300";
}

function Stars({ rating }: { rating: number }) {
  const safeRating = Math.max(1, Math.min(5, Number(rating || 5)));

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= safeRating ? "text-orange-400" : "text-slate-600"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");

  const stats = useMemo(() => {
    return {
      all: reviews.length,
      pending: reviews.filter((item) => item.status === "pending").length,
      approved: reviews.filter((item) => item.status === "approved").length,
      rejected: reviews.filter((item) => item.status === "rejected").length,
    };
  }, [reviews]);

  useEffect(() => {
    loadReviews();
  }, [filter]);

  async function loadReviews() {
    try {
      setLoading(true);
      setErrorText("");

      const data = await getAppReviews(filter);
      setReviews(data);
    } catch (error: any) {
      setErrorText(error?.message || "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(id: string, status: AppReview["status"]) {
    try {
      setBusyId(id);
      setErrorText("");

      await updateReviewStatus(id, status);
      await loadReviews();
    } catch (error: any) {
      setErrorText(error?.message || "Could not update review.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this review permanently?");

    if (!confirmed) return;

    try {
      setBusyId(id);
      setErrorText("");

      await deleteAppReview(id);
      await loadReviews();
    } catch (error: any) {
      setErrorText(error?.message || "Could not delete review.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#07101F] px-5 py-6 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">
              LASU Scholar Admin
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
              Reviews
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">
              Approve student reviews before they appear on the public LASU Scholar website.
            </p>
          </div>

          <button
            onClick={loadReviews}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total" value={stats.all} tone="bg-slate-500/10 text-slate-300" />
          <StatCard title="Pending" value={stats.pending} tone="bg-orange-500/10 text-orange-300" />
          <StatCard title="Approved" value={stats.approved} tone="bg-emerald-500/10 text-emerald-300" />
          <StatCard title="Rejected" value={stats.rejected} tone="bg-red-500/10 text-red-300" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2">
          {filters.map((item) => {
            const active = filter === item.value;

            return (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {errorText ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {errorText}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-500" />
            <p className="font-black text-white">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-3xl text-orange-400">
              ★
            </div>
            <h2 className="text-xl font-black text-white">No reviews here</h2>
            <p className="mt-2 text-sm font-medium text-slate-400">
              Reviews submitted from the app will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-white">
                        {item.display_name || "LASU Scholar Student"}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {item.department || "Department"} • {item.level || "Level"} •{" "}
                      {formatDate(item.created_at)}
                    </p>
                  </div>

                  <Stars rating={item.rating} />
                </div>

                <p className="min-h-[84px] rounded-2xl border border-white/10 bg-[#07101F]/60 p-4 text-sm font-medium leading-6 text-slate-300">
                  {item.review}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {item.status !== "approved" ? (
                    <button
                      disabled={busyId === item.id}
                      onClick={() => handleStatus(item.id, "approved")}
                      className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      Approve
                    </button>
                  ) : null}

                  {item.status !== "rejected" ? (
                    <button
                      disabled={busyId === item.id}
                      onClick={() => handleStatus(item.id, "rejected")}
                      className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  ) : null}

                  {item.status !== "pending" ? (
                    <button
                      disabled={busyId === item.id}
                      onClick={() => handleStatus(item.id, "pending")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-60"
                    >
                      Move to Pending
                    </button>
                  ) : null}

                  <button
                    disabled={busyId === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="ml-auto rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>

                {busyId === item.id ? (
                  <p className="mt-3 text-xs font-bold text-orange-300">
                    Updating review...
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className={`mb-4 inline-flex rounded-2xl px-3 py-2 text-xs font-black ${tone}`}>
        {title}
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">Student reviews</p>
    </div>
  );
}
