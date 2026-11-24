import { Suspense, lazy } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Navbar from './components/Navbar.jsx';
import { LoadingState } from './components/States.jsx';
import { useAuth } from './lib/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Learn from './pages/Learn.jsx';
import { Login, Register } from './pages/AuthPages.jsx';

// Heavier pages (canvas + charts) are code-split.
const Simulator = lazy(() => import('./pages/Simulator.jsx'));
const History = lazy(() => import('./pages/History.jsx'));

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Checking session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function NotFound() {
  return (
    <div className="panel state">
      <h1>404 // Signal lost</h1>
      <p>That page does not exist.</p>
      <Link className="button" to="/">
        Back to base
      </Link>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <div className="ticker" aria-hidden="true">
        <span className="ticker-track">
          Projectile Motion Simulator /// Shree L. R. Tiwari College of Engineering /// ideal model: closed form
          /// air drag model: RK4 integration /// g(earth) = 9.81 m/s2 /// g(moon) = 1.62 m/s2 /// g(mars) = 3.71
          m/s2 /// g(jupiter) = 24.79 m/s2 /// all systems nominal
        </span>
      </div>
      <main id="main" className="shell main">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<LoadingState label="Loading module" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/history"
                element={
                  <RequireAuth>
                    <History />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <div className="shell">Shree L. R. Tiwari College of Engineering // Mini project // Physics engine v1.0</div>
      </footer>
    </>
  );
}
