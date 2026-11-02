import { supabase } from './supabaseClient.js';

/**
 * Cloud Memory Service
 * Implements the 3-tier memory model:
 * 1. Structured Facts: lesson_progress (topics, problems solved, exact timestamps)
 * 2. Semantic Understanding: student_insights (learning style, cognitive patterns)
 */

export const cloudMemoryService = {
  /**
   * Fetches latest lesson facts & semantic insights for the student
   */
  async getStudentContext(userId) {
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

      // 2. Fetch student insights (Semantic / Habits)
      const { data: insights, error: insightsError } = await supabase
        .from('student_insights')
        .select('insight_text, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (insightsError && insightsError.code !== 'PGRST116') {
        console.warn('[CloudMemory] Warning reading student_insights:', insightsError.message);
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
        insights: (insights || []).map((i) => i.insight_text),
      };
    } catch (err) {
      console.warn('[CloudMemory] Note: Database tables might not be created yet, proceeding gracefully:', err?.message || err);
      return null;
    }
  },

  /**
   * Saves or updates structured facts about the current lesson
   */
  async recordLessonProgress(userId, { topic, subtopics = [], problemsAttempted = 0, problemsSolved = 0, lastFormula = null, whiteboardSummary = null }) {
    if (!supabase || !userId) return;

    try {
      const { error } = await supabase.from('lesson_progress').insert({
        user_id: userId,
        topic: topic || 'General Mathematics',
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
    } catch (err) {
      console.warn('[CloudMemory] Error recording progress:', err?.message || err);
    }
  },

  /**
   * Saves a qualitative insight or learning pattern (Semantic Understanding)
   */
  async recordStudentInsight(userId, insightText, category = 'learning_style') {
    if (!supabase || !userId || !insightText) return;

    try {
      const { error } = await supabase.from('student_insights').insert({
        user_id: userId,
        insight_text: insightText,
        category: category,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.warn('[CloudMemory] Could not record insight:', error.message);
      }
    } catch (err) {
      console.warn('[CloudMemory] Error recording insight:', err?.message || err);
    }
  },
};
