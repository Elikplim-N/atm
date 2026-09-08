import { NavLink, useNavigate } from 'react-router-dom';

export default function Navbar({ isAuthed, onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="brand">
        GCB ATM Service Quality
        <small>Real-time customer feedback monitoring</small>
      </div>
      <nav>
        <NavLink to="/feedback" className={({ isActive }) => (isActive ? 'active' : '')}>
          Feedback Form
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
