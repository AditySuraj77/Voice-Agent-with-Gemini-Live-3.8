import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { geminiKeyPool } from '../services/geminiKeyPool.js';

const router = express.Router();

/**
 * POST /api/extract-insights
 * Uses ultra-lightweight gemini-3.5-flash-lite to extract 1-2 cognitive learning insights
 * and gemini-embedding-001 to generate 768-dimensional vector embeddings for Supabase pgvector.
 */
router.post('/extract-insights', async (req, res) => {
  try {
    const { transcript, studentName = 'Student' } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 25) {
      return res.json({ success: true, insights: [] });
    }

    const keyRecord = geminiKeyPool.selectKey();
    const ai = new GoogleGenAI({ apiKey: keyRecord.key });

    const prompt = `You are an expert pedagogical AI analyzing a tutoring dialogue between teacher and student "${studentName}".
Analyze the student's learning style, cognitive strengths, or specific concepts they found tricky.
Output a JSON array of 1 to 2 concise bullet point strings (each max 20 words).
Focus strictly on HOW the student learns or specific misconceptions, not generic facts.
Example output:
["Prefers visual grids when understanding matrix dimensions", "Needs quick confirmation before moving to multi-step calculations"]

Transcript:
${transcript.slice(0, 4000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    let insightTexts = [];
    try {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed)) {
        insightTexts = parsed.filter((item) => typeof item === 'string' && item.trim().length > 0).slice(0, 2);
      }
    } catch (_) {
      console.warn('[InsightRoute] Could not parse JSON response, falling back.');
    }

    // Generate 768-dimensional vector embeddings for each insight using gemini-embedding-001
    const insights = [];
    for (const text of insightTexts) {
      try {
        const embedRes = await ai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: text,
          config: { outputDimensionality: 768 },
        });
        const vectorValues = embedRes.embeddings?.[0]?.values || null;
        insights.push({ text, embedding: vectorValues });
      } catch (embedErr) {
        console.warn('[InsightRoute] Failed to embed insight:', embedErr.message);
        insights.push({ text, embedding: null });
      }
    }

    return res.json({ success: true, insights });
  } catch (error) {
    console.warn('[InsightRoute] Background insight extraction error:', error.message);
    return res.json({ success: false, insights: [], error: error.message });
  }
});

/**
 * POST /api/embed-query
 * Generates a 768-dimensional vector embedding for a topic or search query
 * to run Cosine Similarity search in Supabase pgvector.
 */
router.post('/embed-query', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.json({ success: true, embedding: null });
    }

    const keyRecord = geminiKeyPool.selectKey();
    const ai = new GoogleGenAI({ apiKey: keyRecord.key });

    const embedRes = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text.trim().slice(0, 500),
      config: { outputDimensionality: 768 },
    });

    const vectorValues = embedRes.embeddings?.[0]?.values || null;
    return res.json({ success: true, embedding: vectorValues });
  } catch (err) {
    console.warn('[InsightRoute] Embed query error:', err.message);
    return res.json({ success: false, embedding: null, error: err.message });
  }
});

export default router;
