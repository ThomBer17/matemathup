-- Analytics write path goes through a small RPC so clients cannot forge user_id.

CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_event_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF NULLIF(trim(p_event_type), '') IS NULL THEN
    RAISE EXCEPTION 'empty_event_type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    v_user_id,
    trim(p_event_type),
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_analytics_event(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_analytics_event(text, text, text, jsonb) TO authenticated;

REVOKE INSERT ON public.analytics_events FROM anon, authenticated;
