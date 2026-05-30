-- Freemium: agrega plan al perfil. El conteo de uso se hace contando filas
-- reales en exercise_attempts (adaptativa) y ai_generation_log (tandas),
-- así no hay contadores separados que se desincronicen.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'premium'));

-- Índices para que los conteos diarios de uso sean rápidos
CREATE INDEX IF NOT EXISTS idx_attempts_user_source_created
  ON public.exercise_attempts(user_id, source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ailog_user_created
  ON public.ai_generation_log(user_id, created_at DESC);
