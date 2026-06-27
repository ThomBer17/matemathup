-- Track deterministic validator versions for generated exercises.
-- Version 0/null means "not validated by the current app validator".

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS validation_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_exercises_validation_pending
  ON public.exercises(approved, validation_version, created_at DESC)
  WHERE approved = TRUE;

-- Known corrupt generated exercise: explanation concludes 22/9, but answer key/options say 41/36.
UPDATE public.exercises
SET approved = FALSE,
    validation_version = 0
WHERE id = '9d35d313-f08b-4aeb-b177-b1426f34936f';
