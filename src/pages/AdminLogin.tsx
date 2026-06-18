import { useState } from "react";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showError, setShowError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setShowError("Enter admin email and password.");
      return;
    }

    try {
      setLoading(true);
      setShowError("");

      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (error: any) {
      setShowError(error.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-soft px-4 py-10">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange/10 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-navy/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[34px] border border-orange/10 bg-white p-7 shadow-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-navy text-orange shadow-sm">
          <ShieldCheck size={30} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange">
            LASU Scholar
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy">
            Admin Login
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Secure access for super admins and authorized content managers only.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Admin Email
            </span>

            <div className="flex h-13 items-center gap-3 rounded-2xl border border-orange/10 bg-soft px-4">
              <Mail size={18} className="text-slate-400" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="admin@email.com"
                className="h-12 w-full bg-transparent text-sm font-bold text-navy outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Password
            </span>

            <div className="flex h-13 items-center gap-3 rounded-2xl border border-orange/10 bg-soft px-4">
              <Lock size={18} className="text-slate-400" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Enter password"
                className="h-12 w-full bg-transparent text-sm font-bold text-navy outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          {showError && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
              {showError}
            </div>
          )}

          <button
            disabled={loading}
            className="h-13 w-full rounded-2xl bg-orange px-5 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Enter Admin Dashboard"}
          </button>
        </form>

        <div className="mt-6 rounded-3xl bg-navy p-4 text-center text-white">
          <p className="text-xs font-bold leading-5 text-white/70">
            Only accounts with role <span className="text-orange">admin</span> or{" "}
            <span className="text-orange">super_admin</span> can access this dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}