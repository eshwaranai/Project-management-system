import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionStatus from './SessionStatus';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand"><span className="brand-mark">L</span>Ledger</div>
          <div className="brand-sub">Project Management</div>
        </div>
        <ul className="nav-list">
          <li>
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/projects" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Projects
            </NavLink>
          </li>
        </ul>
        <div className="sidebar-footer">
          <SessionStatus />
          <div className="user-chip">
            <strong>{user?.fullName}</strong>
            {user?.email}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
