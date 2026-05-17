import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "./services/auth";
import LoginPage from "./pages/LoginPage";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeeFilePage from "./pages/EmployeeFilePage";
import SchedulePage from "./pages/SchedulePage";
import ClockPage from "./pages/ClockPage";
import SwapsPage from "./pages/SwapsPage";
import EvaluationsPage from "./pages/EvaluationsPage";

export default function App() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>HR · ניהול עובדים</h1>
        <nav>
          {(user.role !== "EMPLOYEE") && (
            <NavLink to="/employees" className={({ isActive }) => isActive ? "active" : ""}>
              עובדים
            </NavLink>
          )}
          <NavLink to="/schedule" className={({ isActive }) => isActive ? "active" : ""}>
            לוח משמרות
          </NavLink>
          <NavLink to="/clock"    className={({ isActive }) => isActive ? "active" : ""}>
            כניסה / יציאה
          </NavLink>
          <NavLink to="/swaps"    className={({ isActive }) => isActive ? "active" : ""}>
            החלפות
          </NavLink>
          <NavLink to="/evaluations" className={({ isActive }) => isActive ? "active" : ""}>
            הערכות
          </NavLink>
          {user.employeeId && (
            <NavLink to={`/employee/${user.employeeId}`}
                     className={({ isActive }) => isActive ? "active" : ""}>
              התיק שלי
            </NavLink>
          )}
        </nav>
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid #1f2937" }}>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>{user.email}</div>
          <div style={{ color: "#cbd5e1", fontSize: 11, marginBottom: 10 }}>
            {{ ADMIN: "מנהל מערכת", HR: "משאבי אנוש", MANAGER: "מנהל", EMPLOYEE: "עובד" }[user.role]}
          </div>
          <button className="btn secondary" onClick={() => { logout(); nav("/login"); }}>
            יציאה
          </button>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employee/:id" element={<EmployeeFilePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/clock" element={<ClockPage />} />
          <Route path="/swaps" element={<SwapsPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>
    </div>
  );
}
