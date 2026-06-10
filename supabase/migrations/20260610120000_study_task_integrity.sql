-- Integridad de los planes de estudio: distinguir cómo se completó una tarea.
--  - 'auto'   = el alumno estudió de verdad (resolvió N ejercicios correctos del tema).
--               Da XP.
--  - 'manual' = el alumno la marcó a mano (override). NO da XP.
-- Las tareas con fecha futura no se pueden completar (se valida en la app).

ALTER TABLE public.study_plan_tasks
  ADD COLUMN IF NOT EXISTS completion_type TEXT
  CHECK (completion_type IN ('auto', 'manual'));

-- Las tareas ya completadas antes de este cambio se asumen 'manual' (no podemos saber
-- si hubo estudio real detrás del click). A futuro solo el auto-completado da XP.
UPDATE public.study_plan_tasks
  SET completion_type = 'manual'
  WHERE status = 'done' AND completion_type IS NULL;
