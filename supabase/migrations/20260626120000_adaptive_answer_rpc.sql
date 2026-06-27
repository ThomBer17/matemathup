-- Transactional adaptive practice answer flow.
-- The caller never supplies user_id, correctness, XP, or progress counters.

CREATE OR REPLACE FUNCTION public.answer_numeric_value(p_raw TEXT)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s TEXT;
  numerator DOUBLE PRECISION;
  denominator DOUBLE PRECISION;
  inner_value DOUBLE PRECISION;
BEGIN
  IF p_raw IS NULL THEN
    RETURN NULL;
  END IF;

  s := lower(trim(p_raw));
  IF s = '' THEN
    RETURN NULL;
  END IF;

  s := replace(s, ',', '.');
  s := regexp_replace(s, '\s+', '', 'g');

  IF s ~ '^[+-]?\d+(\.\d+)?$' THEN
    RETURN s::DOUBLE PRECISION;
  END IF;

  IF s ~ '^[+-]?\d+(\.\d+)?/[+-]?\d+(\.\d+)?$' THEN
    numerator := split_part(s, '/', 1)::DOUBLE PRECISION;
    denominator := split_part(s, '/', 2)::DOUBLE PRECISION;
    IF denominator = 0 THEN
      RETURN NULL;
    END IF;
    RETURN numerator / denominator;
  END IF;

  IF s ~ '^sqrt\([+-]?\d+(\.\d+)?\)$' THEN
    inner_value := substring(s from '^sqrt\(([+-]?\d+(\.\d+)?)\)$')::DOUBLE PRECISION;
    IF inner_value < 0 THEN
      RETURN NULL;
    END IF;
    RETURN sqrt(inner_value);
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_text_basic(p_raw TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT regexp_replace(
    regexp_replace(lower(trim(coalesce(p_raw, ''))), '[\.\s]+$', '', 'g'),
    '\s+',
    ' ',
    'g'
  )
$$;

CREATE OR REPLACE FUNCTION public.answers_equal(
  p_user_answer TEXT,
  p_correct_answer TEXT,
  p_type public.exercise_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  user_basic TEXT := public.answer_text_basic(p_user_answer);
  correct_basic TEXT := public.answer_text_basic(p_correct_answer);
  user_bool TEXT;
  correct_bool TEXT;
  user_num DOUBLE PRECISION;
  correct_num DOUBLE PRECISION;
BEGIN
  IF p_type = 'true_false' THEN
    user_bool := CASE
      WHEN user_basic = ANY (ARRAY['true', 'verdadero', 'v', 't', 'si', U&'s\00ED', 'yes', 'y', '1']) THEN 'true'
      WHEN user_basic = ANY (ARRAY['false', 'falso', 'f', 'no', 'n', '0']) THEN 'false'
      ELSE NULL
    END;
    correct_bool := CASE
      WHEN correct_basic = ANY (ARRAY['true', 'verdadero', 'v', 't', 'si', U&'s\00ED', 'yes', 'y', '1']) THEN 'true'
      WHEN correct_basic = ANY (ARRAY['false', 'falso', 'f', 'no', 'n', '0']) THEN 'false'
      ELSE NULL
    END;

    IF user_bool IS NOT NULL AND correct_bool IS NOT NULL THEN
      RETURN user_bool = correct_bool;
    END IF;
  END IF;

  IF user_basic = correct_basic THEN
    RETURN TRUE;
  END IF;

  user_num := public.answer_numeric_value(p_user_answer);
  correct_num := public.answer_numeric_value(p_correct_answer);
  IF user_num IS NOT NULL AND correct_num IS NOT NULL THEN
    RETURN abs(user_num - correct_num) <= greatest(
      1e-9::DOUBLE PRECISION,
      1e-6::DOUBLE PRECISION * greatest(abs(user_num), abs(correct_num))
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_adaptive_exercise(
  p_exercise_id UUID,
  p_user_answer TEXT,
  p_hint_used BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  correct BOOLEAN,
  xp_gain INTEGER,
  new_difficulty INTEGER,
  mastery_pct INTEGER,
  leveled_up BOOLEAN,
  new_level INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exercise public.exercises%ROWTYPE;
  v_progress public.user_progress%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_recent JSONB := '[]'::jsonb;
  v_new_recent JSONB;
  v_last_three JSONB;
  v_completed INTEGER;
  v_correct_count INTEGER;
  v_today DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
  v_yesterday DATE := ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 1);
  v_streak INTEGER;
  v_new_xp INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_exercise
  FROM public.exercises
  WHERE id = p_exercise_id
    AND (approved = TRUE OR created_by = v_user_id OR public.has_role(v_user_id, 'teacher'))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'exercise_not_found' USING ERRCODE = 'P0002';
  END IF;

  correct := public.answers_equal(p_user_answer, v_exercise.correct_answer, v_exercise.type);
  xp_gain := CASE WHEN correct THEN 10 + v_exercise.difficulty * 2 ELSE 2 END;

  INSERT INTO public.exercise_attempts (
    user_id,
    exercise_id,
    topic_id,
    user_answer,
    is_correct,
    status,
    source,
    difficulty,
    hint_used
  )
  VALUES (
    v_user_id,
    v_exercise.id,
    v_exercise.topic_id,
    p_user_answer,
    correct,
    CASE WHEN correct THEN 'correct' ELSE 'incorrect' END,
    'adaptive',
    v_exercise.difficulty,
    coalesce(p_hint_used, FALSE)
  );

  IF NOT correct THEN
    INSERT INTO public.srs_items (
      user_id,
      exercise_id,
      topic_id,
      box,
      due_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_exercise.id,
      v_exercise.topic_id,
      0,
      now() + interval '1 day',
      now()
    )
    ON CONFLICT (user_id, exercise_id)
    DO UPDATE SET
      topic_id = excluded.topic_id,
      box = excluded.box,
      due_at = excluded.due_at,
      updated_at = excluded.updated_at;
  END IF;

  SELECT *
  INTO v_progress
  FROM public.user_progress
  WHERE user_id = v_user_id
    AND topic_id = v_exercise.topic_id
  FOR UPDATE;

  IF FOUND AND jsonb_typeof(v_progress.recent_results) = 'array' THEN
    v_recent := v_progress.recent_results;
  END IF;

  SELECT coalesce(jsonb_agg(value ORDER BY ord DESC), '[]'::jsonb)
  INTO v_new_recent
  FROM (
    SELECT value, ord
    FROM jsonb_array_elements(v_recent || to_jsonb(correct)) WITH ORDINALITY AS e(value, ord)
    ORDER BY ord DESC
    LIMIT 5
  ) recent_desc;

  SELECT coalesce(jsonb_agg(value ORDER BY ord DESC), '[]'::jsonb)
  INTO v_new_recent
  FROM jsonb_array_elements(v_new_recent) WITH ORDINALITY AS e(value, ord);

  new_difficulty := greatest(1, least(5, coalesce(v_progress.current_difficulty, v_exercise.difficulty, 2)));

  SELECT coalesce(jsonb_agg(value), '[]'::jsonb)
  INTO v_last_three
  FROM (
    SELECT value
    FROM jsonb_array_elements(v_new_recent) WITH ORDINALITY AS e(value, ord)
    ORDER BY ord DESC
    LIMIT 3
  ) last_desc;

  IF jsonb_array_length(v_last_three) = 3 THEN
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_last_three) AS e(value) WHERE value <> 'true'::jsonb) THEN
      new_difficulty := least(5, new_difficulty + 1);
    ELSIF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_last_three) AS e(value) WHERE value <> 'false'::jsonb) THEN
      new_difficulty := greatest(1, new_difficulty - 1);
    END IF;
  END IF;

  v_completed := coalesce(v_progress.exercises_completed, 0) + 1;
  v_correct_count := coalesce(v_progress.correct_count, 0) + CASE WHEN correct THEN 1 ELSE 0 END;
  mastery_pct := least(100, round((v_correct_count::NUMERIC / v_completed::NUMERIC) * 100)::INTEGER);

  INSERT INTO public.user_progress (
    user_id,
    topic_id,
    current_difficulty,
    exercises_completed,
    correct_count,
    mastery_pct,
    recent_results
  )
  VALUES (
    v_user_id,
    v_exercise.topic_id,
    new_difficulty,
    v_completed,
    v_correct_count,
    mastery_pct,
    v_new_recent
  )
  ON CONFLICT (user_id, topic_id)
  DO UPDATE SET
    current_difficulty = excluded.current_difficulty,
    exercises_completed = excluded.exercises_completed,
    correct_count = excluded.correct_count,
    mastery_pct = excluded.mastery_pct,
    recent_results = excluded.recent_results;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_streak := coalesce(v_profile.current_streak, 0);
    IF v_profile.last_activity_date IS DISTINCT FROM v_today THEN
      v_streak := CASE
        WHEN v_profile.last_activity_date = v_yesterday THEN v_streak + 1
        ELSE 1
      END;
    END IF;

    v_new_xp := coalesce(v_profile.xp, 0) + xp_gain;
    new_level := 1 + floor(v_new_xp::NUMERIC / 100)::INTEGER;
    leveled_up := new_level > coalesce(v_profile.level, 1);

    UPDATE public.profiles
    SET
      current_streak = v_streak,
      longest_streak = greatest(coalesce(longest_streak, 0), v_streak),
      last_activity_date = v_today,
      xp = v_new_xp,
      level = new_level
    WHERE id = v_user_id;
  ELSE
    new_level := 1;
    leveled_up := FALSE;
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.answer_numeric_value(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_text_basic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answers_equal(TEXT, TEXT, public.exercise_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_adaptive_exercise(UUID, TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_task_target(p_kind TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_kind
    WHEN 'general_review' THEN 5
    WHEN 'simulacro' THEN 8
    ELSE 3
  END
$$;

CREATE OR REPLACE FUNCTION public.auto_complete_study_task(p_task_id UUID)
RETURNS TABLE (
  completed BOOLEAN,
  xp_gain INTEGER,
  new_level INTEGER,
  leveled_up BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_task public.study_plan_tasks%ROWTYPE;
  v_topic_id UUID;
  v_correct_count INTEGER;
  v_target INTEGER;
  v_profile public.profiles%ROWTYPE;
  v_new_xp INTEGER;
  v_today DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  completed := FALSE;
  xp_gain := 0;
  new_level := NULL;
  leveled_up := FALSE;

  SELECT *
  INTO v_task
  FROM public.study_plan_tasks
  WHERE id = p_task_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_task.status = 'done' OR v_task.date > v_today THEN
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_task.topic_slug IS NOT NULL THEN
    SELECT id
    INTO v_topic_id
    FROM public.topics
    WHERE slug = v_task.topic_slug
    LIMIT 1;
  END IF;

  SELECT count(*)::INTEGER
  INTO v_correct_count
  FROM public.exercise_attempts
  WHERE user_id = v_user_id
    AND is_correct = TRUE
    AND (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE >= v_task.date
    AND (v_topic_id IS NULL OR topic_id = v_topic_id);

  v_target := public.study_task_target(v_task.kind);
  IF v_correct_count < v_target THEN
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.study_plan_tasks
  SET
    status = 'done',
    completion_type = 'auto',
    completed_at = now()
  WHERE id = v_task.id
    AND user_id = v_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;

  xp_gain := 15;
  completed := TRUE;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_new_xp := coalesce(v_profile.xp, 0) + xp_gain;
    new_level := 1 + floor(v_new_xp::NUMERIC / 100)::INTEGER;
    leveled_up := new_level > coalesce(v_profile.level, 1);

    UPDATE public.profiles
    SET
      xp = v_new_xp,
      level = new_level
    WHERE id = v_user_id;
  END IF;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_study_task_manually(p_task_id UUID)
RETURNS TABLE (
  completed BOOLEAN,
  xp_gain INTEGER,
  new_level INTEGER,
  leveled_up BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_task public.study_plan_tasks%ROWTYPE;
  v_today DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  completed := FALSE;
  xp_gain := 0;
  new_level := NULL;
  leveled_up := FALSE;

  SELECT *
  INTO v_task
  FROM public.study_plan_tasks
  WHERE id = p_task_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_task.date > v_today THEN
    RAISE EXCEPTION 'future_task' USING ERRCODE = '22023';
  END IF;

  IF v_task.status = 'done' THEN
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.study_plan_tasks
  SET
    status = 'done',
    completion_type = 'manual',
    completed_at = now()
  WHERE id = v_task.id
    AND user_id = v_user_id
    AND status = 'pending';

  completed := FOUND;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.replan_study_tasks(p_plan_id UUID)
RETURNS TABLE (updated INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plan public.study_plans%ROWTYPE;
  v_today DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
  v_dates DATE[];
  v_date_count INTEGER;
  v_idx INTEGER := 0;
  v_task RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_plan
  FROM public.study_plans
  WHERE id = p_plan_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(array_agg(day::DATE ORDER BY day), ARRAY[]::DATE[])
  INTO v_dates
  FROM generate_series(v_today, v_plan.exam_date - 1, interval '1 day') AS series(day);

  IF array_length(v_dates, 1) IS NULL THEN
    v_dates := ARRAY[v_today];
  END IF;

  v_date_count := array_length(v_dates, 1);
  updated := 0;

  FOR v_task IN
    SELECT id
    FROM public.study_plan_tasks
    WHERE plan_id = v_plan.id
      AND user_id = v_user_id
      AND status <> 'done'
    ORDER BY order_index
    FOR UPDATE
  LOOP
    UPDATE public.study_plan_tasks
    SET date = v_dates[(v_idx % v_date_count) + 1]
    WHERE id = v_task.id
      AND user_id = v_user_id;

    updated := updated + 1;
    v_idx := v_idx + 1;
  END LOOP;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.study_task_target(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_complete_study_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_study_task_manually(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replan_study_tasks(UUID) TO authenticated;
