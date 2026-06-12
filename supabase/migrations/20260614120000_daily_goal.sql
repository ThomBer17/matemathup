-- Meta diaria de ejercicios (retención). Configurable por usuario; default 3/día.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_goal INTEGER NOT NULL DEFAULT 3;
