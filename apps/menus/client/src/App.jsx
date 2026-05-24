import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Menus from './pages/Menus.jsx';
import MenuBuilder from './pages/MenuBuilder.jsx';
import Items from './pages/Items.jsx';
import Packages from './pages/Packages.jsx';
import AllergiesDiets from './pages/AllergiesDiets.jsx';
import PriceLists from './pages/PriceLists.jsx';
import Coupons from './pages/Coupons.jsx';
import Loyalty from './pages/Loyalty.jsx';
import Seasonal from './pages/Seasonal.jsx';
import Customers from './pages/Customers.jsx';
import Orders from './pages/Orders.jsx';
import OrderBuilder from './pages/OrderBuilder.jsx';

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'דשבורד' },
  { to: '/menus', icon: '🍽️', label: 'תפריטים' },
  { to: '/items', icon: '🥘', label: 'מנות' },
  { to: '/packages', icon: '🎁', label: 'חבילות' },
  { to: '/allergies-diets', icon: '⚠️', label: 'אלרגיות ודיאטות' },
  { to: '/price-lists', icon: '💵', label: 'מחירונים' },
  { to: '/coupons', icon: '🎟️', label: 'קופונים' },
  { to: '/loyalty', icon: '⭐', label: 'נאמנות' },
  { to: '/seasonal', icon: '📅', label: 'תמחור עונתי' },
  { to: '/customers', icon: '👥', label: 'לקוחות' },
  { to: '/orders', icon: '🛒', label: 'הזמנות' },
  { to: '/order-builder', icon: '➕', label: 'בנה הזמנה' },
];

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          תפריטים ומחירונים
          <small>מערכת ניהול קייטרינג</small>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <NavLink key={n.to} to={n.to}>
              <span className="icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/menus" element={<Menus />} />
          <Route path="/menus/:id/builder" element={<MenuBuilder />} />
          <Route path="/items" element={<Items />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/allergies-diets" element={<AllergiesDiets />} />
          <Route path="/price-lists" element={<PriceLists />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/loyalty" element={<Loyalty />} />
          <Route path="/seasonal" element={<Seasonal />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order-builder" element={<OrderBuilder />} />
        </Routes>
      </main>
    </div>
  );
}
