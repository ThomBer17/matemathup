-- Harden RPC execution: authenticated users only.
-- Critical functions still use auth.uid(), but anon should not be able to call them.

REVOKE EXECUTE ON FUNCTION public.answer_numeric_value(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.answer_text_basic(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.answers_equal(TEXT, TEXT, public.exercise_type) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.answer_adaptive_exercise(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.study_task_target(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_complete_study_task(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_study_task_manually(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.replan_study_tasks(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.answer_numeric_value(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_text_basic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answers_equal(TEXT, TEXT, public.exercise_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_adaptive_exercise(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.study_task_target(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_complete_study_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_study_task_manually(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replan_study_tasks(UUID) TO authenticated;
