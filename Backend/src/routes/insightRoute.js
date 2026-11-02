import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { geminiKeyPool } from '../services/geminiKeyPool.js';

const router = express.Router();

/**
 * POST /api/extract-insights
 * Uses ultra-lightweight gemini-3.5-flash-lite to extract 1-2 cognitive learning insights
 * from the session transcript off the live voice path.
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

    let insights = [];
    try {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed)) {
        insights = parsed.filter((item) => typeof item === 'string' && item.trim().length > 0).slice(0, 2);
      }
    } catch (_) {
      console.warn('[InsightRoute] Could not parse JSON response, falling back.');
    }

    return res.json({ success: true, insights });
  } catch (error) {
    console.warn('[InsightRoute] Background insight extraction error:', error.message);
    return res.json({ success: false, insights: [], error: error.message });
  }
});

export default router;
