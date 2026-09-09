import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/gcb-logo.png';

export default function Navbar({ isAuthed, onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-logo-chip">
          <img src={logo} alt="GCB Bank" />
        </span>
        <span className="brand-text">
          GCB Bank PLC
          <small>ATM Service Quality Monitoring</small>
        </span>
      </div>
      <nav>
        <NavLink to="/atm-screen" className={({ isActive }) => (isActive ? 'active' : '')}>
          🏧 ATM Screen
        </NavLink>
        <NavLink to="/feedback" className={({ isActive }) => (isActive ? 'active' : '')}>
          📱 Mobile Form
        </NavLink>
        <NavLink to="/simulator" className={({ isActive }) => (isActive ? 'active' : '')}>
          USSD/SMS Simulator
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        {isAuthed ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
              navigate('/login');
            }}
          >
            Log out
          </a>
        ) : (
          <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
            Admin Login
          </NavLink>
        )}
      </nav>
    </header>
  );
}
