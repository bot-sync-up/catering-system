import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Segments } from './pages/Segments';
import { Templates } from './pages/Templates';
import { Campaigns } from './pages/Campaigns';
import { CampaignEditor } from './pages/CampaignEditor';
import { Tickets } from './pages/Tickets';
import { Surveys } from './pages/Surveys';
import { Chatbot } from './pages/Chatbot';
import { Login } from './pages/Login';

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<RequireAuth><Shell /></RequireAuth>} />
    </Routes>
  );
}

function Shell() {
  return (
    <div className="app">
      <aside className="sidebar">
        <h1>פלטפורמת שיווק</h1>
        <NavLink to="/" end>לוח בקרה</NavLink>
        <NavLink to="/leads">לידים</NavLink>
        <NavLink to="/segments">סגמנטים</NavLink>
        <NavLink to="/templates">תבניות</NavLink>
        <NavLink to="/campaigns">קמפיינים</NavLink>
        <NavLink to="/surveys">סקרי NPS</NavLink>
        <NavLink to="/tickets">פניות</NavLink>
        <NavLink to="/chatbot">צ׳אט-בוט</NavLink>
        <div style={{ marginTop: 'auto', padding: 12 }}>
          <button onClick={() => { localStorage.clear(); location.href = '/login'; }}>יציאה</button>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/segments" element={<Segments />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/new" element={<CampaignEditor />} />
          <Route path="/campaigns/:id" element={<CampaignEditor />} />
          <Route path="/surveys" element={<Surveys />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/chatbot" element={<Chatbot />} />
        </Routes>
      </main>
    </div>
  );
}
