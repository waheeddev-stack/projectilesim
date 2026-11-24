import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import experimentRoutes from './routes/experiments.js';
import statsRoutes from './routes/stats.js';
import { errorHandler } from './lib/errors.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      // Comma separated list of allowed browser origins.
      origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/experiments', experimentRoutes);
  app.use('/api/stats', statsRoutes);

  app.use('/api', (req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route' } }),
  );
  app.use(errorHandler);
  return app;
}
