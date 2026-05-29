-- Progress tracking: enrich exercise_attempts to support adaptive + tanda sources
-- and allow attempts without a persisted exercise (ephemeral tanda activities).

ALTER TABLE public.exercise_attempts ALTER COLUMN exercise_id DROP NOT NULL;

ALTER TABLE public.exercise_attempts ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;
ALTER TABLE public.exercise_attempts ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'adaptive';
ALTER TABLE public.exercise_attempts ADD COLUMN IF NOT EXISTS difficulty INTEGER;
ALTER TABLE public.exercise_attempts ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.exercise_attempts ADD CONSTRAINT exercise_attempts_source_check
  CHECK (source IN ('adaptive', 'tanda'));
ALTER TABLE public.exercise_attempts ADD CONSTRAINT exercise_attempts_status_check
  CHECK (status IS NULL OR status IN ('correct', 'partial', 'incorrect'));

-- Backfill topic_id from exercises join for legacy rows
UPDATE public.exercise_attempts a
SET topic_id = e.topic_id
FROM public.exercises e
WHERE a.exercise_id = e.id AND a.topic_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_attempts_user_topic ON public.exercise_attempts(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_created ON public.exercise_attempts(user_id, created_at DESC);
