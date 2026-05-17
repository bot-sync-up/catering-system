import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Recurring from './pages/Recurring.jsx';
import CoA from './pages/CoA.jsx';
import Budget from './pages/Budget.jsx';
import PettyCash from './pages/PettyCash.jsx';
import Bank from './pages/Bank.jsx';
import Reimbursements from './pages/Reimbursements.jsx';

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function Layout({ children }) {
  const user = getUser();
  const nav = useNavigate();
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    nav('/login');
  };
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>הוצאות ותקציב</h1>
        <nav>
          <NavLink to="/" end>לוח בקרה</NavLink>
          <NavLink to="/expenses">הוצאות</NavLink>
          <NavLink to="/recurring">הוצאות קבועות</NavLink>
          <NavLink to="/budget">תקציב</NavLink>
          <NavLink to="/petty">קופה קטנה</NavLink>
          <NavLink to="/bank">בנק והתאמות</NavLink>
          <NavLink to="/reimbursement">החזרי הוצאות</NavLink>
          <NavLink to="/coa">תוכנית חשבונות</NavLink>
        </nav>
        <div className="user-info">
          {user && (<>
            <div>{user.name}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{user.email}</div>
            <button className="btn small secondary" style={{ marginTop: '0.5rem' }} onClick={logout}>יציאה</button>
          </>)}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
      <Route path="/recurring" element={<Protected><Recurring /></Protected>} />
      <Route path="/coa" element={<Protected><CoA /></Protected>} />
      <Route path="/budget" element={<Protected><Budget /></Protected>} />
      <Route path="/petty" element={<Protected><PettyCash /></Protected>} />
      <Route path="/bank" element={<Protected><Bank /></Protected>} />
      <Route path="/reimbursement" element={<Protected><Reimbursements /></Protected>} />
    </Routes>
  );
}
