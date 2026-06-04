import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MaterialExerciseGenerator } from "@/components/materials/MaterialExerciseGenerator";
import { isMathematicalContent } from "@/lib/materials/classify";
import { CalculatorFAB } from "@/components/calculator/CalculatorFAB";
import { MathWorkspace } from "@/components/workspace/MathWorkspace";

export const Route = createFileRoute("/_authenticated/materials/$id")({
  component: MaterialDetailPage,
});

interface Material {
  id: string;
  file_name: string;
  file_type: string;
  detected_topic: string | null;
  page_count: number | null;
  preview: string | null;
  extracted_text: string | null;
  status: string;
}

function MaterialDetailPage() {
  const { id } = useParams({ from: "/_authenticated/materials/$id" });
  const { user } = useAuth();

  const { data: material, isPending } = useQuery({
    queryKey: ["material", id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("id, file_name, file_type, detected_topic, page_count, preview, extracted_text, status")
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as Material) ?? null;
    },
  });

  if (isPending) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="font-display text-lg font-semibold">Material no encontrado</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const hasText = !!material.extracted_text && material.extracted_text.trim().length >= 40;
  const ready = material.status === "ready";
  const isMath = hasText && isMathematicalContent(material.extracted_text!);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-12">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted">
          {material.file_type === "pdf" ? (
            <FileText className="h-6 w-6 text-rose-500" />
          ) : (
            <ImageIcon className="h-6 w-6 text-sky-500" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-bold">{material.file_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {material.detected_topic ? `Tema: ${material.detected_topic}` : "Sin clasificar"}
            {material.page_count != null && ` · ${material.page_count} páginas`}
          </p>
        </div>
      </div>

      {/* Generador desde el material */}
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-soft md:p-8">
        {ready && hasText && isMath ? (
          <MaterialExerciseGenerator materialId={material.id} topicHint={material.detected_topic} />
        ) : material.status === "processing" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando el material…
          </div>
        ) : ready && hasText && !isMath ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm">
              Este material no parece contener matemática, así que no podemos generar ejercicios.
            </p>
            <p className="text-xs">Subí una guía o ejercicios de matemática para usar esta función.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <Sparkles className="h-6 w-6 text-primary" />
            <p className="text-sm">
              Este material no tiene texto suficiente para generar ejercicios.
            </p>
          </div>
        )}
      </div>

      {/* Texto extraído */}
      {material.preview && (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vista previa del contenido
          </p>
          <div className="max-h-48 overflow-y-auto rounded-xl border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
            {material.preview}
          </div>
        </div>
      )}

      {/* Herramientas de estudio mientras resolvés (mismas que en los temas) */}
      <CalculatorFAB />
      <MathWorkspace storageKey={`mathup:workspace:material-${material.id}`} />
    </div>
  );
}
