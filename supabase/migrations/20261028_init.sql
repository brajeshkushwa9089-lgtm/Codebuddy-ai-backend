-- ====================================================================
-- CodeBuddy AI — Initial PostgreSQL Database Migration & RLS Security
-- Migration Version: 20261028_init.sql
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. CONVERSATIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    language VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. CONVERSATION MESSAGES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. PRACTICE PROBLEMS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    language VARCHAR(30) NOT NULL,
    topic VARCHAR(80) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    input_description TEXT NOT NULL,
    output_description TEXT NOT NULL,
    constraints TEXT NOT NULL,
    sample_input TEXT NOT NULL,
    sample_output TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. PRACTICE ATTEMPTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    hints_used INTEGER NOT NULL DEFAULT 0 CHECK (hints_used >= 0 AND hints_used <= 5),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. LEARNING ACTIVITY TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    language VARCHAR(30) NOT NULL,
    topic VARCHAR(80),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
    ON public.conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_convo_created 
    ON public.conversation_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_practice_problems_user_created 
    ON public.practice_problems(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_problem 
    ON public.practice_attempts(user_id, problem_id);

CREATE INDEX IF NOT EXISTS idx_learning_activity_user_created 
    ON public.learning_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_activity_type_user 
    ON public.learning_activity(activity_type, user_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. Conversations Policies
CREATE POLICY "Users can view their own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
    ON public.conversations FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Conversation Messages Policies (Parent Ownership check)
CREATE POLICY "Users can view messages from their conversations"
    ON public.conversation_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = conversation_messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their conversations"
    ON public.conversation_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = conversation_messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages in their conversations"
    ON public.conversation_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE public.conversations.id = conversation_messages.conversation_id
            AND public.conversations.user_id = auth.uid()
        )
    );

-- 4. Practice Problems Policies
CREATE POLICY "Users can view their own practice problems"
    ON public.practice_problems FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own practice problems"
    ON public.practice_problems FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice problems"
    ON public.practice_problems FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice problems"
    ON public.practice_problems FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Practice Attempts Policies (Parent & Self Ownership)
CREATE POLICY "Users can view their own practice attempts"
    ON public.practice_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice attempts"
    ON public.practice_attempts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.practice_problems
            WHERE public.practice_problems.id = practice_attempts.problem_id
            AND public.practice_problems.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own practice attempts"
    ON public.practice_attempts FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. Learning Activity Policies
CREATE POLICY "Users can view their own learning activity"
    ON public.learning_activity FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning activity"
    ON public.learning_activity FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- When a user registers via Supabase Auth, populate public.profiles
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, created_at, updated_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

