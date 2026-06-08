-- Plan de Estudio Inteligente: el alumno indica un examen y MatemathUp arma un plan.
-- Soporta múltiples planes/exámenes simultáneos por usuario.

CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  daily_minutes INTEGER NOT NULL DEFAULT 30,
  topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],   -- slugs de los temas que entran
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  topic_slug TEXT,                                  -- null para repaso general / simulacro
  topic_name TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('practice', 'review', 'general_review', 'simulacro')),
  title TEXT NOT NULL,
  objective TEXT,
  minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  completed_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user ON public.study_plans(user_id, exam_date);
CREATE INDEX IF NOT EXISTS idx_study_tasks_plan ON public.study_plan_tasks(plan_id, date);
CREATE INDEX IF NOT EXISTS idx_study_tasks_user ON public.study_plan_tasks(user_id);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plans (select)" ON public.study_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own plans (insert)" ON public.study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own plans (update)" ON public.study_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own plans (delete)" ON public.study_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users manage own tasks (select)" ON public.study_plan_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tasks (insert)" ON public.study_plan_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own tasks (update)" ON public.study_plan_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tasks (delete)" ON public.study_plan_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
