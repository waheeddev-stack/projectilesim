# Projectile Motion Simulator

Mini project - Shree L. R. Tiwari College of Engineering.

An interactive simulator: set launch angle, velocity and air resistance, watch the trajectory animate on a canvas,
read off max height / range / time of flight, plot graphs, play a target-hit game, and save experiments to a SQL
database (TiDB / MySQL).

| Layer    | Tech                                                                  |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 18 + Vite, React Router, Recharts, HTML5 Canvas, plain CSS      |
| Backend  | Node.js + Express, zod validation, JWT (httpOnly cookie), bcryptjs    |
| Database | Prisma ORM on TiDB Cloud (MySQL protocol); switchable to SQLite/Postgres |
| Tests    | Vitest (physics) + Vitest/supertest (API)                              |

_Screenshots: (placeholder) `docs/simulator.png`, `docs/target-mode.png`, `docs/history.png`_

## Layout

```
client/   React app (Vite).  src/physics/ holds the pure physics engine + tests
server/   Express API + Prisma (prisma/schema.prisma, seed.js)
```

The physics engine (`client/src/physics/engine.js`, `target.js`) is framework-free. The browser uses it for the
animation, and the server imports the same files to recompute results when an experiment is saved.

## Setup

Requires Node 20.12+ (tested on Node 24).

```powershell
npm run install:all        # installs root, server and client dependencies (+ prisma generate)
copy server\.env.example server\.env   # then edit the values (see below)
npm run db:create          # CREATE DATABASE IF NOT EXISTS <TIDB_DATABASE>
npm run db:migrate         # creates the tables (prisma db push)
npm run db:seed            # demo user: demo@example.com / demo12345
npm run dev                # API on :4000, client on http://localhost:5173
```

### Environment variables (`server/.env`)

| Variable                                                      | Purpose                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `PORT`                                                        | API port (default 4000)                                       |
| `CLIENT_ORIGIN`                                               | Allowed browser origin(s) for CORS, comma separated           |
| `JWT_SECRET`                                                  | Long random string used to sign login tokens                  |
| `AUTH_RATE_LIMIT`                                             | Max register/login requests per IP per 15 minutes (default 20) |
| `TIDB_HOST` `TIDB_PORT` `TIDB_USER` `TIDB_PASSWORD` `TIDB_DATABASE` `TIDB_SSL` | Used by `db:create` and the tests    |
| `DATABASE_URL`                                                | Prisma connection string, e.g. `mysql://USER:PASS@HOST:4000/DB?sslaccept=strict` |

`.env` is git-ignored; `.env.example` lists every variable. The client needs no env in development (Vite proxies
`/api` to the server). For a separately hosted API set `VITE_API_URL` at build time and add the client origin to
`CLIENT_ORIGIN`.

### Using another database

The schema avoids enums and vendor types. To use SQLite locally set `provider = "sqlite"` in
`server/prisma/schema.prisma`, remove the `@db.VarChar(...)` attributes, and set `DATABASE_URL="file:./dev.db"`.
For PostgreSQL change the provider and URL (and drop the `@db.VarChar` attributes).

`db:migrate` runs `prisma db push` because TiDB Serverless cannot host the shadow database that
`prisma migrate dev` needs. It is idempotent and safe to re-run.

## Scripts (root)

| Script                | What it does                                           |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Server (watch mode) and Vite client together           |
| `npm run build`       | Production build of the client (`client/dist`)         |
| `npm start`           | Starts the API (`NODE_ENV=production` for secure cookies) |
| `npm test`            | Physics tests, then API tests                          |
| `npm run lint`        | ESLint                                                 |
| `npm run format`      | Prettier                                               |
| `npm run db:create` / `db:migrate` / `db:seed` | Database helpers              |

API tests use a separate database named `<TIDB_DATABASE>_test` (created automatically) and delete the users they
create.

## API reference

All responses are JSON. Errors always look like `{ "error": { "code": "...", "message": "..." } }`.
Auth is an httpOnly `pms_token` cookie (a `Authorization: Bearer <token>` header is also accepted).

| Method | Path                    | Auth | Description |
| ------ | ----------------------- | ---- | ----------- |
| POST   | `/api/auth/register`    | -    | `{name, email, password(min 8)}` -> `{user}`, sets cookie |
| POST   | `/api/auth/login`       | -    | `{email, password}` -> `{user}`, sets cookie |
| POST   | `/api/auth/logout`      | -    | Clears the cookie |
| GET    | `/api/auth/me`          | yes  | Current user |
| GET    | `/api/experiments`      | yes  | Query: `page`, `pageSize(<=50)`, `mode=free\|target`, `sort=createdAt\|range\|maxHeight\|velocity\|angle`, `order=asc\|desc` -> `{data,page,pageSize,total,totalPages}` |
| POST   | `/api/experiments`      | yes  | Parameters (+ `note`, and `target:{targetX,targetY,targetSize,difficulty,attempts}` in target mode). Results are recomputed on the server |
| GET    | `/api/experiments/:id`  | yes  | One experiment (own data only, else 404) |
| DELETE | `/api/experiments/:id`  | yes  | Delete (cascades to the target attempt) |
| GET    | `/api/stats`            | yes  | Totals, hit rate, best/average score, average range and height |

Security: helmet headers, CORS limited to `CLIENT_ORIGIN`, rate limiting on register/login, bcrypt (cost 10), JWT in an
httpOnly + SameSite=Lax cookie (Secure in production), zod validation on every body/query, per-user data scoping.

## Physics and assumptions

- **Ideal model** (closed form): `x = v0 cosθ t`, `y = h0 + v0 sinθ t - ½ g t²`; time of flight is the positive root of
  `y = 0`; max height `h0 + (v0 sinθ)² / 2g`; range is `x` at landing.
- **Drag model**: `ax = -k v vx`, `ay = -g - k v vy`, `k = ½ ρ Cd A / m`, integrated with RK4 at `dt = 2 ms`
  (the step grows only for extremely long flights to cap the work at ~400k steps). Landing is found by linear
  interpolation between the last point above ground and the first below it. Max height and apex time come from the
  integration steps.
- **Air resistance level** (beginner slider) maps 0-100 % to `Cd = 0-2`; mass, area and air density come from the
  Advanced section (defaults: a baseball, 0.145 kg, 0.0043 m², ρ = 1.225).
- **Compare mode** always uses the drag model for the solid line and the ideal model for the dashed line.
- Inputs are validated and clamped (`LIMITS` in `engine.js`). Air density is a constant (no altitude effect), the
  Earth does not rotate, there is no wind or spin.
- **Playback**: real time at 1x; flights longer than ~10 s are fast-forwarded to fit. Users with
  `prefers-reduced-motion` get the finished trajectory immediately.
- **Target mode**: the target is a circle. A shot hits if any segment of the trajectory comes within the radius
  (not only the landing point). Miss distance = closest approach minus radius. Score for a hit =
  `max(10, 100 - 15·(attempt-1)) × (0.5 + 0.5·accuracy)`. Medium and hard force air drag (Cd 0.5 and 1.0).
- Choices not in the brief: runs are capped at 6 on the canvas; saved target results are re-scored on the server using
  the stored attempt number; the history "Load" button opens `/simulator?load=<id>` and fills the controls (press
  Launch to run it).

## Visual design

HUD / sci-fi "FUI" theme: all colours are CSS variables at the top of `client/src/styles.css`. Cyan `#00FFFF`,
blue `#0080FF`, alert red `#FF0000`, ok green `#00FF00` on `#0A0F1C`. Palette colours that fail WCAG AA as text (red,
blue) use lighter text variants (`--text-alert`, `--text-blue`) while the pure colours stay for lines and glows.
Decorative motion (ticker, scan line, blinking dots, line drawing) stops under `prefers-reduced-motion`. The font
stack prefers JetBrains Mono if installed, and falls back to system monospace (no web font is downloaded).

## Deployment (Vercel + Render + TiDB)

**API on Render** - `render.yaml` is a Blueprint (New > Blueprint, pick this repo). It creates the web service
`projectilesim-api`; set `DATABASE_URL` (the TiDB `mysql://...?sslaccept=strict` URL) in the dashboard. `JWT_SECRET` is
generated for you. Check `https://projectilesim-api.onrender.com/api/health`. The free plan sleeps when idle, so the
first request after a pause is slow. If you name the service differently, change the URL in `client/vercel.json`.

**Client on Vercel** - import the repo with *Root Directory* `client` (Vite is auto-detected). `client/vercel.json`
rewrites `/api/*` to the Render API, so the browser only talks to one origin and the SameSite login cookie works.
Then add the domain (e.g. `projectilesim.linkpc.net`) in the Vercel project and create the DNS records it shows.
Set `CLIENT_ORIGIN` on Render to that domain.
