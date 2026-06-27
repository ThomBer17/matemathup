-- Additional integrity constraints that complement RLS and RPCs.

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_xp_nonnegative CHECK (xp >= 0) NOT VALID,
  ADD CONSTRAINT profiles_level_positive CHECK (level >= 1) NOT VALID,
  ADD CONSTRAINT profiles_streaks_nonnegative CHECK (current_streak >= 0 AND longest_streak >= 0) NOT VALID;

ALTER TABLE public.user_progress
  ADD CONSTRAINT user_progress_counts_nonnegative
    CHECK (exercises_completed >= 0 AND correct_count >= 0) NOT VALID,
  ADD CONSTRAINT user_progress_correct_lte_completed
    CHECK (correct_count <= exercises_completed) NOT VALID,
  ADD CONSTRAINT user_progress_mastery_range
    CHECK (mastery_pct >= 0 AND mastery_pct <= 100) NOT VALID;

CREATE OR REPLACE FUNCTION public.prevent_future_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done'
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.completed_at IS DISTINCT FROM NEW.completed_at)
     AND NEW.date > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE THEN
    RAISE EXCEPTION 'future_task' USING ERRCODE = '22023';
  END IF;

  IF NEW.status = 'done' AND NEW.completion_type IS NULL THEN
    RAISE EXCEPTION 'missing_completion_type' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_future_task_completion_trigger ON public.study_plan_tasks;
CREATE TRIGGER prevent_future_task_completion_trigger
  BEFORE UPDATE ON public.study_plan_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_future_task_completion();

REVOKE EXECUTE ON FUNCTION public.prevent_future_task_completion() FROM PUBLIC, anon;
