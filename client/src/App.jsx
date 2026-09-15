import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import FeedbackForm from './pages/FeedbackForm.jsx';
import Simulator from './pages/Simulator.jsx';
import AtmScreen from './pages/AtmScreen.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Routes a real customer lands on (kiosk screen, mobile feedback form) skip
// the internal nav bar — it links to admin/dev-only pages (Simulator,
// Dashboard, Admin Login) that would give away that this is a prototype.
const CUSTOMER_FACING_PATHS = ['/atm-screen', '/kiosk', '/feedback'];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('atm_admin_token'));
  const location = useLocation();
  const showNavbar = !CUSTOMER_FACING_PATHS.includes(location.pathname);

  function handleLogin(newToken) {
    localStorage.setItem('atm_admin_token', newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem('atm_admin_token');
    setToken(null);
  }

  return (
    <div className="app-shell">
      {showNavbar && <Navbar isAuthed={!!token} onLogout={handleLogout} />}
      <div className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/atm-screen" replace />} />
          <Route path="/atm-screen" element={<AtmScreen />} />
          <Route path="/kiosk" element={<AtmScreen />} />
          <Route path="/feedback" element={<FeedbackForm />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route
            path="/dashboard"
            element={token ? <Dashboard /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </div>
      {showNavbar && (
        <footer className="app-footer">
          &copy; {new Date().getFullYear()} GCB Bank PLC. All feedback is used solely to improve
          ATM service quality.
        </footer>
      )}
    </div>
  );
}
