import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, FileText, Image as ImageIcon, Trash2, Loader2,
  BookMarked, AlertCircle, Sparkles, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { detectKind, extractFromFile, makePreview, type MaterialKind } from "@/lib/materials/process";
import { classifyMaterial } from "@/lib/materials/classify";

interface Material {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  detected_topic: string | null;
  page_count: number | null;
  preview: string | null;
  extracted_text: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export function MyMaterials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: materials = [] } = useQuery({
    queryKey: ["materials", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Material[];
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["materials", user?.id] });

  const processFile = async (file: File) => {
    if (!user) return;
    const kind = detectKind(file);
    if (!kind) {
      toast.error(`"${file.name}" no es un formato soportado (PDF o imagen).`);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("El archivo supera los 15 MB.");
      return;
    }

    // 1) Registro inmediato en estado "procesando" → aparece en la lista.
    const { data: inserted, error: insErr } = await supabase
      .from("materials")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_type: kind,
        mime_type: file.type || null,
        file_size: file.size,
        status: "processing",
      })
      .select()
      .single();

    if (insErr || !inserted) {
      toast.error("No se pudo registrar el material.");
      return;
    }
    const id = inserted.id as string;
    refetch();

    try {
      // 2) Subir el archivo crudo (best-effort; si falla, seguimos con el texto).
      let storagePath: string | null = null;
      try {
        const path = `${user.id}/${id}-${sanitize(file.name)}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, file);
        if (!upErr) storagePath = path;
        else console.warn("[materials] storage upload falló:", upErr.message);
      } catch (e) {
        console.warn("[materials] storage upload excepción:", e);
      }

      // 3) Extraer texto + clasificar (en el browser).
      const { text, pageCount } = await extractFromFile(file, kind as MaterialKind);
      const classification = classifyMaterial(text);

      // 4) Persistir resultado.
      await supabase
        .from("materials")
        .update({
          storage_path: storagePath,
          extracted_text: text || null,
          preview: text ? makePreview(text) : null,
          page_count: pageCount,
          detected_topic: classification.topic,
          status: "ready",
        })
        .eq("id", id);
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al procesar";
      await supabase.from("materials").update({ status: "error", error_message: msg }).eq("id", id);
      refetch();
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    // Procesamos secuencialmente (OCR es pesado) sin bloquear la UI.
    Array.from(files).reduce(
      (chain, file) => chain.then(() => processFile(file)),
      Promise.resolve(),
    );
  };

  const handleDelete = async (m: Material) => {
    if (!window.confirm(`¿Eliminar "${m.file_name}"?`)) return;
    if (m.storage_path) {
      await supabase.storage.from("materials").remove([m.storage_path]).catch(() => {});
    }
    await supabase.from("materials").delete().eq("id", m.id);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookMarked className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Mi Material</h2>
      </div>

      {/* Zona de subida */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30",
        )}
      >
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700">
          <Upload className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-medium">Arrastrá un archivo o hacé click para subir</p>
        <p className="text-xs text-muted-foreground">PDF o imágenes (JPG, PNG, WEBP) · hasta 15 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Listado */}
      {materials.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {materials.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                  {m.file_type === "pdf" ? (
                    <FileText className="h-4 w-4 text-rose-500" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-sky-500" />
                  )}
                </div>
                <Link
                  to="/materials/$id"
                  params={{ id: m.id }}
                  className="group min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium">{m.file_name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <StatusBadge status={m.status} topic={m.detected_topic} />
                    {m.page_count != null && <span>· {m.page_count} pág.</span>}
                    {m.file_size != null && <span>· {formatSize(m.file_size)}</span>}
                  </div>
                </Link>
                {m.status === "ready" && (
                  <Link
                    to="/materials/$id"
                    params={{ id: m.id }}
                    className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5 sm:flex"
                  >
                    Generar <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  aria-label="Eliminar"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, topic }: { status: string; topic: string | null }) {
  if (status === "processing" || status === "uploading") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Procesando…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertCircle className="h-3 w-3" /> Error
      </span>
    );
  }
  // ready
  return (
    <span className="inline-flex items-center gap-1">
      <Sparkles className="h-3 w-3 text-primary" />
      {topic ? `Tema: ${topic}` : "Sin clasificar"}
    </span>
  );
}
