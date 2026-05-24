import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Vehicles from './pages/Vehicles.jsx';
import VehicleDetail from './pages/VehicleDetail.jsx';
import Drivers from './pages/Drivers.jsx';
import Expenses from './pages/Expenses.jsx';
import Mileage from './pages/Mileage.jsx';
import Documents from './pages/Documents.jsx';
import Alerts from './pages/Alerts.jsx';
import Reports from './pages/Reports.jsx';
import Login from './pages/Login.jsx';

function useAuth() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  return [user, (u) => {
    if (u) localStorage.setItem('user', JSON.stringify(u)); else localStorage.removeItem('user');
    setUser(u);
  }];
}

export default function App() {
  const [user, setUser] = useAuth();
  const nav = useNavigate();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={(u) => { setUser(u); nav('/'); }} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    nav('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>צי רכבים</h1>
        <nav>
          <NavLink to="/" end>לוח בקרה</NavLink>
          <NavLink to="/vehicles">רכבים</NavLink>
          <NavLink to="/drivers">נהגים</NavLink>
          <NavLink to="/documents">תוקפים</NavLink>
          <NavLink to="/expenses">הוצאות שוטפות</NavLink>
          <NavLink to="/mileage">נסועה</NavLink>
          <NavLink to="/alerts">התראות</NavLink>
          <NavLink to="/reports">דוחות</NavLink>
        </nav>
        <div className="user" style={{ marginTop: 24 }}>
          <div>שלום, {user.name}</div>
          <div style={{ fontSize: 11 }}>{user.email}</div>
          <button className="ghost" style={{ marginTop: 8, background: '#1e293b', color: '#fff', borderColor: '#334155' }} onClick={logout}>התנתקות</button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/mileage" element={<Mileage />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
