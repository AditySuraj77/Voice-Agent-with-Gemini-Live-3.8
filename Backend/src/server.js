import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Robustly load .env from Backend folder or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../Backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import tokenRouter from './routes/tokenRoute.js';
import searchRouter from './routes/searchRoute.js';
import browserRouter from './routes/browserRoute.js';
import youtubeRouter from './routes/youtubeRoute.js';
import animationRouter from './routes/animationRoute.js';
import insightRouter from './routes/insightRoute.js';
import { browserService } from './services/browserService.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Allowed origins for local development
const allowedLocalOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);

// Configured production client origins (comma-separated if multiple)
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Flexible and secure CORS configuration for production and local development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    if (allowedLocalOrigins.has(origin) || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Automatically allow Vercel deployment and preview subdomains
    if (/\.vercel\.app$/.test(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    console.warn(`[CORS] Request rejected from disallowed origin: ${origin}`);
    return callback(new Error(`CORS origin ${origin} is not allowed by policy.`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-gemini-api-key'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting for token endpoint to prevent spamming
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 token requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token requests, please try again shortly.' }
});

// Rate limiting for web search tool endpoint to protect Tavily quota
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 search requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many search requests, please slow down.' }
});

// Rate limiting for YouTube transcript tool endpoint
const youtubeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 25, // Limit each IP to 25 YouTube requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many YouTube requests, please slow down.' }
});

// Rate limiting for browser automation endpoint to prevent CPU/RAM exhaustion
const browserLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 browser actions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many browser automation requests, please slow down.' }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS),
    tavilyConfigured: Boolean(process.env.TAVILY_API_KEY),
    searchProvider: (process.env.SEARCH_PROVIDER || 'duckduckgo').toLowerCase()
  });
});

// Ephemeral token endpoint
app.use('/api', tokenLimiter, tokenRouter);

// Web search tool endpoint protected by searchLimiter
app.use('/api', searchLimiter, searchRouter);

// YouTube search & transcript tool endpoint
app.use('/api', youtubeLimiter, youtubeRouter);

// Browser automation tool endpoint protected by browserLimiter
app.use('/api', browserLimiter, browserRouter);

// Educational animations & Manim mathematical scene endpoints
app.use('/api', animationRouter);
app.use('/api', insightRouter);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Backend] Gemini Live Voice Agent Server listening on http://localhost:${PORT}`);
  console.log(`[Backend] Allowed CORS origins:`, Array.from(allowedLocalOrigins).concat(configuredOrigins));
  if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEYS) {
    console.warn('[Backend] WARNING: GEMINI_API_KEY / GEMINI_API_KEYS not set in environment or .env file!');
  } else {
    console.log('[Backend] Gemini API key(s) detected.');
  }
  if (!process.env.TAVILY_API_KEY) {
    console.warn('[Backend] NOTE: TAVILY_API_KEY is not set. Real-time web search will default to DuckDuckGo.');
  } else {
    console.log('[Backend] TAVILY_API_KEY detected. Real-time web search enabled.');
  }
  console.log('[Backend] Autonomous Chromium Browser Control ready.');
});

// Graceful cleanup
const shutdown = async () => {
  console.log('[Backend] Shutting down server and closing browser session...');
  await browserService.close();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Global safety crash guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend] ⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Backend] ⚠️ Uncaught Exception:', err);
});
