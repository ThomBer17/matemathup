-- answer_adaptive_exercise updates progress, profile XP/streak, attempts and SRS.
-- After direct table writes were revoked from authenticated users, this RPC must
-- run as definer while still deriving the acting user from auth.uid().

ALTER FUNCTION public.answer_adaptive_exercise(UUID, TEXT, BOOLEAN)
  SECURITY DEFINER
  SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.answer_adaptive_exercise(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_adaptive_exercise(UUID, TEXT, BOOLEAN) TO authenticated;
