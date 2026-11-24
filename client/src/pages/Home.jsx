import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle.js';

export default function Home() {
  usePageTitle('Home', 'Launch projectiles, explore air resistance and play the target game.');
  return (
    <div className="stack">
      <section className="hero">
        <div>
          <p className="label">
            <span className="status-dot status-dot--ok" aria-hidden="true" /> Systems online
          </p>
          <h1>Projectile motion simulator</h1>
          <p>
            Set the launch angle, velocity and air resistance, watch the trajectory unfold, and read off the maximum
            height, range and time of flight. Compare the ideal parabola with a real drag trajectory, then test your
            aim in target mode.
          </p>
          <div className="row">
            <Link className="button button--primary" to="/simulator">
              Launch simulator
            </Link>
            <Link className="button" to="/simulator?mode=target">
              Target mode
            </Link>
            <Link className="button" to="/learn">
              Learn the physics
            </Link>
          </div>
        </div>
        <svg className="line-draw" viewBox="0 0 400 220" role="img" aria-label="Diagram of a projectile trajectory">
          <path className="line-draw__dim" pathLength="1" d="M20 190 H380" strokeWidth="1" />
          <path className="line-draw__dim" pathLength="1" d="M20 20 V190" strokeWidth="1" />
          <path pathLength="1" d="M20 190 Q 200 -80 380 190" strokeWidth="2" />
          <path pathLength="1" d="M20 190 Q 170 -10 300 190" strokeWidth="1.5" style={{ stroke: 'var(--blue)' }} />
          <path className="line-draw__dim" pathLength="1" d="M200 190 V55" strokeWidth="1" />
          <path pathLength="1" d="M20 190 L56 160" strokeWidth="2" />
        </svg>
      </section>

      <section className="grid-3" aria-label="Features">
        <article className="panel">
          <h2>Simulate</h2>
          <p>Closed-form ideal motion and an RK4 integrator for quadratic air drag, on Earth, the Moon, Mars or Jupiter.</p>
        </article>
        <article className="panel">
          <h2>Analyse</h2>
          <p>Live readouts, multi-run comparison on one canvas, and graphs of path, height and speed.</p>
        </article>
        <article className="panel">
          <h2>Play and save</h2>
          <p>Hit the target on three difficulty levels. Log in to save experiments and review your history.</p>
        </article>
      </section>
    </div>
  );
}
