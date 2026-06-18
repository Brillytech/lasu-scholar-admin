import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { loading, session, isAdmin } = useAdminAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-soft">
        <div className="rounded-[28px] border border-orange/10 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange/20 border-t-orange" />
          <p className="mt-4 text-sm font-black text-navy">
            Checking admin access...
          </p>
        </div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}