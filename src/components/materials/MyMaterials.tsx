import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Loader2,
  BookMarked,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { cn } from "@/lib/utils";
import {
  detectKind,
  extractFromFile,
  makePreview,
  isZip,
  expandZip,
  type MaterialKind,
} from "@/lib/materials/process";
import { classifyMaterial } from "@/lib/materials/classify";
import {
  createMaterialRecord,
  deleteMaterialRecord,
  finalizeMaterialRecord,
  markMaterialError,
} from "@/lib/materials/materials.functions";
import { track, EV } from "@/lib/analytics/events";

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
  const createMaterialRecordFn = useServerFn(createMaterialRecord);
  const finalizeMaterialRecordFn = useServerFn(finalizeMaterialRecord);
  const markMaterialErrorFn = useServerFn(markMaterialError);
  const deleteMaterialRecordFn = useServerFn(deleteMaterialRecord);
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

  const processSingleFile = async (file: File) => {
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
    let material;
    try {
      material = await createMaterialRecordFn({
        data: {
          fileName: file.name,
          fileType: kind,
          mimeType: file.type || null,
          fileSize: file.size,
        },
      });
    } catch {
      toast.error("No se pudo registrar el material.");
      return;
    }
    const id = material.id;
    track(EV.materialUploaded, {
      entityType: "material",
      entityId: id,
      metadata: { file_type: kind },
    });
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
      await finalizeMaterialRecordFn({
        data: {
          materialId: id,
          storagePath,
          extractedText: text || null,
          preview: text ? makePreview(text) : null,
          pageCount,
          detectedTopic: classification.topic,
        },
      });
      track(EV.materialProcessed, {
        entityType: "material",
        entityId: id,
        metadata: { topic: classification.topic, is_math: classification.isMath },
      });
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al procesar";
      await markMaterialErrorFn({ data: { materialId: id, errorMessage: msg } }).catch(() => {});
      refetch();
    }
  };

  const handleZip = async (file: File) => {
    if (file.size > 60 * 1024 * 1024) {
      toast.error("El ZIP supera los 60 MB.");
      return;
    }
    let inner: File[] = [];
    try {
      inner = await expandZip(file);
    } catch {
      toast.error(`No se pudo abrir "${file.name}".`);
      return;
    }
    if (inner.length === 0) {
      toast.error(`"${file.name}" no contiene PDFs ni imágenes.`);
      return;
    }
    toast.success(`${inner.length} archivo${inner.length === 1 ? "" : "s"} del ZIP, procesando…`);
    for (const f of inner) await processSingleFile(f);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    // Procesamos secuencialmente (OCR/unzip pesados) sin bloquear la UI.
    Array.from(files).reduce(
      (chain, file) =>
        chain.then(() => {
          // RAR/7z/tar no se pueden descomprimir en el navegador → mensaje claro.
          if (/\.(rar|7z|tar|gz|tgz)$/i.test(file.name)) {
            toast.error(
              `No soportamos ${file.name.split(".").pop()?.toUpperCase()}. Convertilo a ZIP (o subí los PDFs sueltos).`,
            );
            return Promise.resolve();
          }
          return isZip(file) ? handleZip(file) : processSingleFile(file);
        }),
      Promise.resolve(),
    );
  };

  const handleDelete = async (m: Material) => {
    if (!window.confirm(`¿Eliminar "${m.file_name}"?`)) return;
    try {
      await deleteMaterialRecordFn({ data: { materialId: m.id } });
      track(EV.materialDeleted, { entityType: "material", entityId: m.id });
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo eliminar el material.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookMarked className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Mi Material</h2>
      </div>

      {/* Zona de subida */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/30",
        )}
      >
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700">
          <Upload className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-medium">Arrastrá un archivo o hacé click para subir</p>
        <p className="text-xs text-muted-foreground">
          PDF, imágenes (JPG, PNG, WEBP) o ZIP · hasta 15 MB (60 MB el ZIP)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,application/zip,.zip"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
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
                <Link to="/materials/$id" params={{ id: m.id }} className="group min-w-0 flex-1">
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
