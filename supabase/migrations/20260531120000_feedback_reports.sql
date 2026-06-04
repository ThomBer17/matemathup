-- Sistema de feedback / reporte de errores.
-- Los usuarios reportan problemas (matemáticos, evaluación, UI, sugerencias) sin salir de la app.

CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'math_error', 'wrong_evaluation', 'incomplete_exercise', 'ui_problem', 'suggestion', 'other'
  )),
  message TEXT NOT NULL,
  topic TEXT,
  exercise_id UUID,            -- nullable: las tandas IA no persisten ejercicio
  difficulty INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,  -- correct_answer, user_answer, type, source, statement, ua, url...
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'fixed', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback_reports(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_exercise ON public.feedback_reports(exercise_id);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- Usuarios: pueden crear y ver sus propios reportes.
CREATE POLICY "Users insert own reports" ON public.feedback_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own reports" ON public.feedback_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins: ven todo y actualizan estado.
CREATE POLICY "Admins see all reports" ON public.feedback_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.feedback_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
