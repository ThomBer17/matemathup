-- Persistent rate limits for AI endpoints.
-- One row per authenticated user + bucket. The function updates the row atomically.

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_updated_at
  ON public.ai_rate_limits(updated_at);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own AI rate limits"
  ON public.ai_rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_bucket TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  ok BOOLEAN,
  retry_in_sec INTEGER,
  remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_now TIMESTAMPTZ := now();
  v_row public.ai_rate_limits%ROWTYPE;
  v_elapsed DOUBLE PRECISION;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_bucket IS NULL OR trim(p_bucket) = '' OR p_limit <= 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'invalid_rate_limit_input' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ai_rate_limits(user_id, bucket, count, window_start, updated_at)
  VALUES (v_user_id, p_bucket, 0, v_now, v_now)
  ON CONFLICT (user_id, bucket) DO NOTHING;

  SELECT *
  INTO v_row
  FROM public.ai_rate_limits
  WHERE user_id = v_user_id
    AND bucket = p_bucket
  FOR UPDATE;

  v_elapsed := extract(epoch FROM (v_now - v_row.window_start));

  IF v_elapsed >= p_window_seconds THEN
    UPDATE public.ai_rate_limits
    SET count = 1,
        window_start = v_now,
        updated_at = v_now
    WHERE user_id = v_user_id
      AND bucket = p_bucket;

    ok := TRUE;
    retry_in_sec := NULL;
    remaining := greatest(0, p_limit - 1);
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.count >= p_limit THEN
    ok := FALSE;
    retry_in_sec := greatest(1, ceil(p_window_seconds - v_elapsed)::INTEGER);
    remaining := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.ai_rate_limits
  SET count = count + 1,
      updated_at = v_now
  WHERE user_id = v_user_id
    AND bucket = p_bucket;

  ok := TRUE;
  retry_in_sec := NULL;
  remaining := greatest(0, p_limit - v_row.count - 1);
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
