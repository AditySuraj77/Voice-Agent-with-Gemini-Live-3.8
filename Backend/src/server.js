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

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Rate limiting for token endpoint to prevent spamming
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 token requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token requests, please try again shortly.' }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Ephemeral token endpoint
app.use('/api', tokenLimiter, tokenRouter);

// Start server
app.listen(PORT, () => {
  console.log(`[Backend] Gemini Live Voice Agent Server listening on http://localhost:${PORT}`);
  console.log(`[Backend] Client CORS origin: ${CLIENT_ORIGIN}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Backend] WARNING: GEMINI_API_KEY is not set in environment or .env file!');
  } else {
    console.log('[Backend] GEMINI_API_KEY detected.');
  }
});
