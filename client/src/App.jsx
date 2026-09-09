import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import FeedbackForm from './pages/FeedbackForm.jsx';
import Simulator from './pages/Simulator.jsx';
import AtmScreen from './pages/AtmScreen.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('atm_admin_token'));

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
      <Navbar isAuthed={!!token} onLogout={handleLogout} />
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
      <footer className="app-footer">
        &copy; {new Date().getFullYear()} GCB Bank PLC. All feedback is used solely to improve ATM
        service quality.
      </footer>
    </div>
  );
}
