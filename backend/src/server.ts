import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/database.js';
import authRoutes   from './routes/auth.js';
import designRoutes from './routes/designs.js';
import adminRoutes  from './routes/admin.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app  = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ── Security ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Body / Cookie parsing ─────────────────────────────────────
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Rate limiting ─────────────────────────────────────────────
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30,
  message: { success: false, error: 'Too many attempts — try again later' } });
const apiLimit  = rateLimit({ windowMs: 15 * 60 * 1000, max: 300,
  message: { success: false, error: 'Rate limit exceeded' } });

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',    authLimit, authRoutes);
app.use('/api/designs', apiLimit,  designRoutes);
app.use('/api/admin',   apiLimit,  adminRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() } });
});

// ── Error handling ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log('\n🪔  LAMP Studio API');
    console.log(`    ↳  http://localhost:${PORT}/api/health`);
    console.log(`    ↳  ENV: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start();
export default app;
