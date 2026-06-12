-- Test Diagnóstico inicial: marca si el usuario ya lo completó, para no volver a
-- ofrecerlo y para mostrar el estado correcto en el dashboard. El efecto real del
-- diagnóstico (dominio + dificultad inicial por tema) se guarda en user_progress.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diagnostic_completed BOOLEAN NOT NULL DEFAULT false;
