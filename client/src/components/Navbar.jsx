import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const cls = ({ isActive }) => `navbar__link${isActive ? ' active' : ''}`;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="shell navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="status-dot" aria-hidden="true" />
          Projectile // Sim
        </Link>
        <nav aria-label="Main" className="navbar__links">
          <NavLink to="/simulator" className={cls}>
            Simulator
          </NavLink>
          <NavLink to="/simulator?mode=target" className={() => 'navbar__link'}>
            Target
          </NavLink>
          <NavLink to="/learn" className={cls}>
            Learn
          </NavLink>
          {user && (
            <NavLink to="/history" className={cls}>
              History
            </NavLink>
          )}
          {loading ? (
            <span className="navbar__user" role="status">
              ...
            </span>
          ) : user ? (
            <>
              <span className="navbar__user">
                <span className="sr-only">Signed in as </span>
                {user.name}
              </span>
              <button className="button button--small" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={cls}>
                Login
              </NavLink>
              <NavLink to="/register" className="button button--small">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
