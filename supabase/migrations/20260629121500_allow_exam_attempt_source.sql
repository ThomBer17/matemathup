-- Exam simulations are recorded in exercise_attempts with source='exam'.
-- The original progress-tracking constraint only allowed adaptive/tanda.

ALTER TABLE public.exercise_attempts
  DROP CONSTRAINT IF EXISTS exercise_attempts_source_check;

ALTER TABLE public.exercise_attempts
  ADD CONSTRAINT exercise_attempts_source_check
  CHECK (source IN ('adaptive', 'tanda', 'exam'));
