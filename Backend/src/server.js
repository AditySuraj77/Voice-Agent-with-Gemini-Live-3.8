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
import { browserService } from './services/browserService.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
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
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    tavilyConfigured: Boolean(process.env.TAVILY_API_KEY)
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Backend] Gemini Live Voice Agent Server listening on http://localhost:${PORT}`);
  console.log(`[Backend] Client CORS origin: ${CLIENT_ORIGIN}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Backend] WARNING: GEMINI_API_KEY is not set in environment or .env file!');
  } else {
    console.log('[Backend] GEMINI_API_KEY detected.');
  }
  if (!process.env.TAVILY_API_KEY) {
    console.warn('[Backend] NOTE: TAVILY_API_KEY is not set. Real-time web search will be disabled until set.');
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
