import { supabase } from './supabaseClient.js';

/**
 * Cloud Memory Service
 * Implements Google's 3-tier memory model:
 * 1. Structured Facts: lesson_progress (topics, problems solved, smart deduplication)
 * 2. Semantic Understanding: student_insights with 768-dim pgvector embeddings and Cosine Similarity search
 * 3. Full Whiteboard Session Sync: study_sessions (ChatGPT-like cross-device session restore)
 */

export const cloudMemoryService = {
  /**
   * Fetches latest lesson facts & semantic insights for the student.
   * If currentTopic is provided, runs Cosine Similarity vector search on 768-dim embeddings!
   */
  async getStudentContext(userId, currentTopic = null) {
    if (!supabase || !userId) return null;

    try {
      // 1. Fetch latest lesson progress (Structured Facts)
      const { data: progressList, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (progressError && progressError.code !== 'PGRST116') {
        console.warn('[CloudMemory] Warning reading lesson_progress:', progressError.message);
      }

      const latestLesson = progressList && progressList.length > 0 ? progressList[0] : null;

      // 2. Fetch student insights: Try Vector Semantic Search if topic is provided, else fallback to latest
      let retrievedInsights = [];

      const searchTopic = currentTopic || latestLesson?.topic || null;
      if (searchTopic && typeof searchTopic === 'string' && searchTopic.trim().length > 2) {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
          const embedRes = await fetch(`${backendUrl}/api/embed-query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: searchTopic.trim() }),
          });
          const embedData = await embedRes.json();

          if (embedData?.embedding && Array.isArray(embedData.embedding) && embedData.embedding.length === 768) {
            const { data: matched, error: matchError } = await supabase.rpc('match_student_insights', {
              query_embedding: embedData.embedding,
              match_threshold: 0.3,
              match_count: 3,
              filter_user_id: userId,
            });

            if (!matchError && matched && matched.length > 0) {
              retrievedInsights = matched.map((m) => m.insight_text);
              console.log(`[CloudMemory] 🎯 Vector semantic search matched ${matched.length} insight(s) for topic "${searchTopic}"`);
            }
          }
        } catch (vecErr) {
          console.warn('[CloudMemory] Vector search fallback to latest:', vecErr.message);
        }
      }

      // Fallback: If no vector matches found (or no topic specified), fetch latest 5
      if (retrievedInsights.length === 0) {
        const { data: insights } = await supabase
          .from('student_insights')
          .select('insight_text, category')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        retrievedInsights = (insights || []).map((i) => i.insight_text);
      }

      return {
        latestLesson: latestLesson
          ? {
              topic: latestLesson.topic,
              subtopics: latestLesson.subtopics || [],
              problemsAttempted: latestLesson.problems_attempted || 0,
              problemsSolved: latestLesson.problems_solved || 0,
              lastFormula: latestLesson.last_formula || null,
              whiteboardSummary: latestLesson.whiteboard_summary || null,
              updatedAt: latestLesson.updated_at,
            }
          : null,
        insights: retrievedInsights,
      };
    } catch (err) {
      console.warn('[CloudMemory] Note: Database tables might not be created yet, proceeding gracefully:', err?.message || err);
      return null;
    }
  },

  /**
   * Saves or updates structured facts about the current lesson.
   * If the student worked on the same topic today, updates the existing row instead of duplicating!
   */
  async recordLessonProgress(userId, { topic, subtopics = [], problemsAttempted = 0, problemsSolved = 0, lastFormula = null, whiteboardSummary = null }) {
    if (!supabase || !userId) return;

    try {
      const activeTopic = topic || 'General Mathematics';
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('topic', activeTopic)
        .gte('created_at', todayStart.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('lesson_progress')
          .update({
            subtopics: subtopics,
            problems_attempted: problemsAttempted,
            problems_solved: problemsSolved,
            last_formula: lastFormula,
            whiteboard_summary: whiteboardSummary,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id);
        console.log('[CloudMemory] Updated existing lesson progress row for:', activeTopic);
      } else {
        const { error } = await supabase.from('lesson_progress').insert({
          user_id: userId,
          topic: activeTopic,
          subtopics: subtopics,
          problems_attempted: problemsAttempted,
          problems_solved: problemsSolved,
          last_formula: lastFormula,
          whiteboard_summary: whiteboardSummary,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.warn('[CloudMemory] Could not record lesson progress:', error.message);
        } else {
          console.log('[CloudMemory] Recorded lesson progress to Supabase for user:', userId);
        }
      }
    } catch (err) {
      console.warn('[CloudMemory] Error recording progress:', err?.message || err);
    }
  },

  /**
   * Saves a qualitative insight with optional 768-dim vector embedding into public.student_insights
   */
  async recordStudentInsight(userId, insightText, embedding = null, category = 'learning_style') {
    if (!supabase || !userId || !insightText) return;

    try {
      const row = {
        user_id: userId,
        insight_text: insightText,
        category: category,
        created_at: new Date().toISOString(),
      };

      if (Array.isArray(embedding) && embedding.length === 768) {
        row.embedding = embedding;
      }

      const { error } = await supabase.from('student_insights').insert(row);

      if (error) {
        console.warn('[CloudMemory] Could not record insight:', error.message);
      } else {
        console.log('[CloudMemory] 🧠 Stored insight' + (row.embedding ? ' with 768-dim vector embedding' : '') + ' into Supabase');
      }
    } catch (err) {
      console.warn('[CloudMemory] Error recording insight:', err?.message || err);
    }
  },

  /**
   * Calls the backend to extract 1-2 cognitive insights using gemini-3.5-flash-lite,
   * generates 768-dim vector embeddings with gemini-embedding-001, and stores both in Supabase!
   */
  async extractAndSaveInsights(userId, transcript, studentName = 'Student') {
    if (!supabase || !userId || !transcript || transcript.length < 25) return;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/extract-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, studentName }),
      });
      const data = await res.json();
      if (data?.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        for (const item of data.insights) {
          const text = typeof item === 'string' ? item : item.text;
          const embedding = item?.embedding || null;
          await this.recordStudentInsight(userId, text, embedding);
        }
        console.log(`[CloudMemory] 🧠 Extracted & saved ${data.insights.length} student insights with vector embeddings into Supabase!`);
      }
    } catch (err) {
      console.warn('[CloudMemory] Insight extraction background warning:', err?.message || err);
    }
  },

  /**
   * Saves a full study session to Supabase cloud (ChatGPT-style cross-device restore)
   */
  async saveCloudSession(userId, sessionEntry) {
    if (!supabase || !userId || !sessionEntry?.id) return;
    try {
      const { error } = await supabase.from('study_sessions').upsert({
        id: sessionEntry.id,
        user_id: userId,
        title: sessionEntry.title || 'Study Session',
        items: sessionEntry.items || [],
        canvas_snapshot: sessionEntry.canvasSnapshot || null,
        created_at: sessionEntry.createdAt || new Date().toISOString(),
        updated_at: sessionEntry.updatedAt || new Date().toISOString(),
      });

      if (error) {
        console.warn('[CloudMemory] Warning saving session to Supabase:', error.message);
      } else {
        console.log('[CloudMemory] ☁️ Synced whiteboard session to Supabase cloud:', sessionEntry.id);
      }
    } catch (e) {
      console.warn('[CloudMemory] Save session error:', e?.message || e);
    }
  },

  /**
   * Fetches all cloud study sessions for user
   */
  async fetchUserSessions(userId) {
    if (!supabase || !userId) return [];
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') {
          console.warn('[CloudMemory] Warning fetching cloud sessions:', error.message);
        }
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        items: row.items || [],
        itemsCount: (row.items || []).length,
        canvasSnapshot: row.canvas_snapshot || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        dateStr: new Date(row.updated_at).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        timeStr: new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
    } catch (e) {
      console.warn('[CloudMemory] Fetch cloud sessions error:', e?.message || e);
      return [];
    }
  },

  /**
   * Deletes a study session from Supabase cloud
   */
  async deleteCloudSession(userId, sessionId) {
    if (!supabase || !userId || !sessionId) return;
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);
      if (error) console.warn('[CloudMemory] Error deleting cloud session:', error.message);
    } catch (e) {
      console.warn('[CloudMemory] Delete cloud session error:', e?.message || e);
    }
  },

  /**
   * Clears all study sessions for a user from Supabase cloud
   */
  async clearAllCloudSessions(userId) {
    if (!supabase || !userId) return;
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', userId);
      if (error) console.warn('[CloudMemory] Error clearing cloud sessions:', error.message);
    } catch (e) {
      console.warn('[CloudMemory] Clear cloud sessions error:', e?.message || e);
    }
  },
};
