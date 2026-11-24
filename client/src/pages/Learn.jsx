import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle.js';

export default function Learn() {
  usePageTitle('Learn', 'Projectile motion equations and the effect of air resistance.');
  return (
    <article className="panel prose">
      <h1>Learn: projectile motion</h1>
      <p>
        A projectile is any object launched and then moved only by gravity (and, in real life, air). Horizontal and
        vertical motion are independent: horizontally the velocity stays constant, vertically gravity pulls the object
        down at <b>g</b>.
      </p>

      <h2>Ideal motion (no air)</h2>
      <p>With launch speed v0, angle θ and starting height h0:</p>
      <code className="eq">x(t) = v0 · cos θ · t</code>
      <code className="eq">y(t) = h0 + v0 · sin θ · t − ½ · g · t²</code>
      <ul>
        <li>
          <b>Time of flight</b>: the positive root of y(t) = 0.
        </li>
        <li>
          <b>Maximum height</b>: h0 + (v0 · sin θ)² / (2g), reached at t = v0 · sin θ / g.
        </li>
        <li>
          <b>Range</b>: x at the time of flight. From the ground it is v0² · sin 2θ / g, so 45° is the best angle.
        </li>
      </ul>
      <p>
        Example: v0 = 20 m/s, θ = 45°, g = 9.81 gives a range of 40.77 m, a maximum height of 10.19 m and a flight
        time of 2.88 s.
      </p>

      <h2>Air resistance</h2>
      <p>
        At everyday speeds drag grows with the square of speed and always opposes the motion. With v = √(vx² + vy²):
      </p>
      <code className="eq">ax = −k · v · vx</code>
      <code className="eq">ay = −g − k · v · vy</code>
      <code className="eq">k = ½ · ρ · Cd · A / m</code>
      <p>
        ρ is air density (1.225 kg/m³ at sea level), Cd the drag coefficient (a sphere is about 0.47), A the
        cross-section area and m the mass. These equations have no simple closed form, so the simulator integrates them
        with the fourth-order Runge-Kutta method (RK4) using a 2 ms time step.
      </p>
      <p>Compared with the ideal parabola, drag:</p>
      <ul>
        <li>shortens the range and lowers the peak,</li>
        <li>makes the descent steeper than the climb, so the path is no longer symmetric,</li>
        <li>moves the best angle below 45°,</li>
        <li>lowers the impact speed, because energy is lost to the air.</li>
      </ul>
      <p>
        Turn on <b>Compare</b> in the simulator to overlay both trajectories and see the difference.
      </p>

      <h2>Other worlds</h2>
      <p>
        Gravity sets the pace: the Moon (1.62 m/s²) sends the same launch about six times further than Earth (9.81
        m/s²), while Jupiter (24.79 m/s²) cuts it to well under half. Note that the drag model above assumes Earth-like
        air; on the Moon there is no air, so keep air resistance off there.
      </p>

      <div className="row">
        <Link className="button button--primary" to="/simulator">
          Try it in the simulator
        </Link>
      </div>
    </article>
  );
}
