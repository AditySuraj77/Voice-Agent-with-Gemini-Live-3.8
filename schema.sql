-- =========================================================================
-- Supabase Database Schema & Migrations for Aristotle AI Voice & Whiteboard Tutor
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- =========================================================================

-- 1. Enable pgvector extension for 768-dimensional semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Structured Facts: lesson_progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    subtopics JSONB DEFAULT '[]'::jsonb,
    problems_solved INTEGER DEFAULT 0,
    mastery_score INTEGER DEFAULT 0,
    notes_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id, updated_at DESC);

-- 3. Semantic Cognitive Memory: student_insights table with 768-dim vector embeddings
CREATE TABLE IF NOT EXISTS public.student_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_text TEXT NOT NULL,
    embedding VECTOR(768),
    confidence NUMERIC DEFAULT 1.0,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Vector HNSW index for high-speed Cosine Similarity search
CREATE INDEX IF NOT EXISTS idx_student_insights_embedding 
ON public.student_insights 
USING hnsw (embedding vector_cosine_ops);

-- Index for user filtering
CREATE INDEX IF NOT EXISTS idx_student_insights_user_id ON public.student_insights(user_id);

-- 4. Full Whiteboard & Session Restore: study_sessions table
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    title TEXT,
    active_topic TEXT,
    whiteboard_state JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id, updated_at DESC);

-- =========================================================================
-- 5. Stored Procedure for Cosine Similarity Search in pgvector
-- =========================================================================
CREATE OR REPLACE FUNCTION public.match_student_insights(
    query_embedding VECTOR(768),
    match_threshold FLOAT,
    match_count INT,
    filter_user_id UUID
)
RETURNS TABLE (
    id UUID,
    insight_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.id,
        si.insight_text,
        1 - (si.embedding <=> query_embedding) AS similarity
    FROM public.student_insights si
    WHERE si.user_id = filter_user_id
      AND 1 - (si.embedding <=> query_embedding) > match_threshold
    ORDER BY si.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =========================================================================
-- 6. Row Level Security (RLS) - Data Isolation per Student
-- =========================================================================

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_progress
CREATE POLICY "Users can view their own lesson progress" 
ON public.lesson_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson progress" 
ON public.lesson_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson progress" 
ON public.lesson_progress FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson progress" 
ON public.lesson_progress FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for student_insights
CREATE POLICY "Users can view their own insights" 
ON public.student_insights FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" 
ON public.student_insights FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" 
ON public.student_insights FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights" 
ON public.student_insights FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for study_sessions
CREATE POLICY "Users can view their own study sessions" 
ON public.study_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions" 
ON public.study_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions" 
ON public.study_sessions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions" 
ON public.study_sessions FOR DELETE 
USING (auth.uid() = user_id);
