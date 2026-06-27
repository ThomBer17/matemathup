CREATE OR REPLACE FUNCTION public.submit_diagnostic_results(p_results jsonb)
RETURNS TABLE(updated_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_slug text;
  v_topic_id uuid;
  v_mastery numeric;
  v_difficulty integer;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array' THEN
    RAISE EXCEPTION 'invalid_results' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_results) > 100 THEN
    RAISE EXCEPTION 'too_many_results' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_results)
  LOOP
    v_slug := NULLIF(trim(v_item->>'topic_slug'), '');

    IF v_slug IS NULL THEN
      RAISE EXCEPTION 'invalid_topic_slug' USING ERRCODE = '22023';
    END IF;

    IF COALESCE(v_item->>'mastery_pct', '') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'invalid_mastery_pct' USING ERRCODE = '22023';
    END IF;

    IF COALESCE(v_item->>'difficulty', '') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'invalid_difficulty' USING ERRCODE = '22023';
    END IF;

    v_mastery := LEAST(100, GREATEST(0, (v_item->>'mastery_pct')::numeric));
    v_difficulty := LEAST(5, GREATEST(1, (v_item->>'difficulty')::integer));

    SELECT id INTO v_topic_id
    FROM public.topics
    WHERE slug = v_slug;

    IF v_topic_id IS NULL THEN
      RAISE EXCEPTION 'unknown_topic_slug' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.user_progress (
      user_id,
      topic_id,
      mastery_pct,
      current_difficulty,
      updated_at
    )
    VALUES (
      v_user_id,
      v_topic_id,
      v_mastery,
      v_difficulty,
      now()
    )
    ON CONFLICT (user_id, topic_id) DO UPDATE
      SET mastery_pct = EXCLUDED.mastery_pct,
          current_difficulty = EXCLUDED.current_difficulty,
          updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.profiles
  SET diagnostic_completed = true,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN QUERY SELECT v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_diagnostic_results(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_diagnostic_results(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_diagnostic_results(jsonb) TO authenticated;

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, username, avatar_url, daily_goal) ON public.profiles TO authenticated;

REVOKE INSERT, UPDATE ON public.user_progress FROM anon, authenticated;
REVOKE UPDATE ON public.study_plan_tasks FROM anon, authenticated;
