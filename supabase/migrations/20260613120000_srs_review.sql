-- Repaso espaciado (SRS estilo Leitner) sobre los ejercicios que el alumno falló.
-- Cuando falla un ejercicio (adaptativo, con exercise_id), se encola acá. El repaso
-- lo reprograma: si lo entendió, sube de "caja" y se aleja la próxima revisión
-- (1, 3, 7, 14, 30 días); si no, vuelve a la caja 0 y se revisa pronto.

CREATE TABLE IF NOT EXISTS public.srs_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  box INTEGER NOT NULL DEFAULT 0,            -- caja Leitner (0..5)
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- cuándo toca repasar
  reviews INTEGER NOT NULL DEFAULT 0,        -- cantidad de repasos hechos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_srs_due ON public.srs_items(user_id, due_at);

ALTER TABLE public.srs_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own srs (select)" ON public.srs_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own srs (insert)" ON public.srs_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own srs (update)" ON public.srs_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own srs (delete)" ON public.srs_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
