import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminLogin from "./pages/AdminLogin";

import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Topics from "./pages/Topics";
import Questions from "./pages/Questions";
import Materials from "./pages/Materials";
import Students from "./pages/Students";
import Practice from "./pages/Practice";
import Exams from "./pages/Exams";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import AdminLogs from "./pages/AdminLogs";
import Notifications from "./pages/Notifications";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/students" element={<Students />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin-logs" element={<AdminLogs />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
