 -- Material propio: biblioteca de estudio del usuario.
-- v1: upload + extracción de texto + clasificación + almacenamiento. (Sin generación IA todavía.)

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,             -- 'pdf' | 'image'
  mime_type TEXT,
  file_size INTEGER,
  storage_path TEXT,                   -- ruta en el bucket (nullable si falló el upload)
  detected_topic TEXT,                 -- nombre del tema o NULL = "Sin clasificar"
  page_count INTEGER,
  preview TEXT,                        -- primeros caracteres del texto
  extracted_text TEXT,                 -- texto completo (base para RAG/embeddings futuros)
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_user ON public.materials(user_id, created_at DESC);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own materials (select)" ON public.materials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own materials (insert)" ON public.materials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own materials (update)" ON public.materials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own materials (delete)" ON public.materials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bucket privado para los archivos. Cada usuario guarda bajo <uid>/...
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'materials' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materials' AND (storage.foldername(name))[1] = auth.uid()::text);
