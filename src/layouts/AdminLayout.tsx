import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useAdminAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const { logout } = useAdminAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f4ea] text-navy dark:bg-slate-950">
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <main className="min-h-screen lg:ml-72">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex justify-end px-4 pt-4 sm:px-6 lg:px-8">
          <button
            onClick={logout}
            className="rounded-2xl bg-navy px-4 py-2 text-xs font-black text-white transition hover:scale-105"
          >
            Logout
          </button>
        </div>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}