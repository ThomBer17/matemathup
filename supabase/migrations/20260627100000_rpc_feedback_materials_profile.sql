-- RPCs for lower-risk write paths moved out of the browser.
-- These complement RLS by revoking direct table writes where the app now uses
-- validated functions.

CREATE OR REPLACE FUNCTION public.submit_feedback_report(
  p_type text,
  p_message text,
  p_topic text DEFAULT NULL,
  p_exercise_id uuid DEFAULT NULL,
  p_difficulty integer DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_report_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_type NOT IN ('math_error', 'wrong_evaluation', 'incomplete_exercise', 'ui_problem', 'suggestion', 'other') THEN
    RAISE EXCEPTION 'invalid_report_type' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(trim(p_message), '') IS NULL THEN
    RAISE EXCEPTION 'empty_report_message' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.feedback_reports (
    user_id,
    type,
    message,
    topic,
    exercise_id,
    difficulty,
    metadata
  )
  VALUES (
    v_user_id,
    p_type,
    trim(p_message),
    p_topic,
    p_exercise_id,
    p_difficulty,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_feedback_report_status(
  p_report_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('open', 'reviewing', 'fixed', 'closed') THEN
    RAISE EXCEPTION 'invalid_report_status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.feedback_reports
  SET status = p_status
  WHERE id = p_report_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_material_record(
  p_file_name text,
  p_file_type text,
  p_mime_type text DEFAULT NULL,
  p_file_size integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_material_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF NULLIF(trim(p_file_name), '') IS NULL THEN
    RAISE EXCEPTION 'empty_file_name' USING ERRCODE = '22023';
  END IF;

  IF p_file_type NOT IN ('pdf', 'image') THEN
    RAISE EXCEPTION 'invalid_material_file_type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.materials (
    user_id,
    file_name,
    file_type,
    mime_type,
    file_size,
    status
  )
  VALUES (
    v_user_id,
    p_file_name,
    p_file_type,
    p_mime_type,
    p_file_size,
    'processing'
  )
  RETURNING id INTO v_material_id;

  RETURN v_material_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_material_record(
  p_material_id uuid,
  p_storage_path text DEFAULT NULL,
  p_extracted_text text DEFAULT NULL,
  p_preview text DEFAULT NULL,
  p_page_count integer DEFAULT NULL,
  p_detected_topic text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.materials
  SET storage_path = p_storage_path,
      extracted_text = p_extracted_text,
      preview = p_preview,
      page_count = p_page_count,
      detected_topic = p_detected_topic,
      status = 'ready',
      error_message = NULL
  WHERE id = p_material_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_material_error(
  p_material_id uuid,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.materials
  SET status = 'error',
      error_message = COALESCE(NULLIF(trim(p_error_message), ''), 'Error al procesar')
  WHERE id = p_material_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_material_record(
  p_material_id uuid
)
RETURNS TABLE(deleted boolean, storage_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_storage_path text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT m.storage_path INTO v_storage_path
  FROM public.materials m
  WHERE m.id = p_material_id
    AND m.user_id = auth.uid();

  DELETE FROM public.materials
  WHERE id = p_material_id
    AND user_id = auth.uid();

  RETURN QUERY SELECT FOUND, v_storage_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_daily_goal(
  p_daily_goal integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_daily_goal NOT IN (3, 5, 10) THEN
    RAISE EXCEPTION 'invalid_daily_goal' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET daily_goal = p_daily_goal,
      updated_at = now()
  WHERE id = auth.uid();

  RETURN p_daily_goal;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback_report(text, text, text, uuid, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_feedback_report_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_material_record(text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_material_record(uuid, text, text, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_material_error(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_material_record(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_daily_goal(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_feedback_report(text, text, text, uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_feedback_report_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_material_record(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_material_record(uuid, text, text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_material_error(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_material_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_goal(integer) TO authenticated;

REVOKE INSERT, UPDATE ON public.feedback_reports FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.materials FROM anon, authenticated;
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, username, avatar_url) ON public.profiles TO authenticated;
