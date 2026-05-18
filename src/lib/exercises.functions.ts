import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ExerciseSchema = z.object({
  statement: z.string().min(5),
  type: z.enum(["multiple_choice", "true_false", "open"]),
  options: z.array(z.string()).optional(),
  correct_answer: z.string().min(1),
  explanation: z.string().min(5),
  hints: z.array(z.string()).default([]),
});

export const generateExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topicId: string; topicName: string; difficulty: number }) => input)
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Falta LOVABLE_API_KEY");

    const { topicId, topicName, difficulty } = data;
    const diffLabel =
      ["muy fácil", "fácil", "intermedio", "difícil", "muy difícil"][difficulty - 1] ?? "intermedio";

    const systemPrompt = `Eres un profesor de matemática argentino para 5to y 6to año de secundaria.
Generas ejercicios pedagógicamente correctos, con coherencia matemática perfecta.
SIEMPRE respondes con JSON válido siguiendo exactamente el schema solicitado.
Usa notación clara (ej: x^2, sqrt(2), pi, infinito) sin LaTeX.`;

    const userPrompt = `Generá UN ejercicio de "${topicName}" de dificultad ${diffLabel} (nivel ${difficulty}/5).
Devolvé SOLO un objeto JSON con esta estructura exacta:
{
  "statement": "enunciado claro y conciso",
  "type": "multiple_choice" | "true_false" | "open",
  "options": ["opción A", "opción B", "opción C", "opción D"],   // solo si type=multiple_choice
  "correct_answer": "respuesta correcta exacta (debe coincidir con una opción si es multiple_choice; 'true'/'false' si true_false)",
  "explanation": "explicación paso a paso de la resolución",
  "hints": ["pista 1 sutil", "pista 2 más directa"]
}
Variá el tipo. Verificá que la respuesta sea matemáticamente correcta.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Límite de uso alcanzado. Probá en unos segundos.");
    if (res.status === 402) throw new Error("Sin créditos de IA disponibles.");
    if (!res.ok) throw new Error(`Error de IA (${res.status})`);

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: z.infer<typeof ExerciseSchema>;
    try {
      parsed = ExerciseSchema.parse(JSON.parse(content));
    } catch (e) {
      console.error("AI parse error", e, content);
      throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
    }

    // Persist exercise (pending approval flag = true for v1 demo, in real use teacher approves)
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("exercises")
      .insert({
        topic_id: topicId,
        statement: parsed.statement,
        type: parsed.type,
        options: parsed.options ?? null,
        correct_answer: parsed.correct_answer,
        explanation: parsed.explanation,
        hints: parsed.hints,
        difficulty,
        ai_generated: true,
        approved: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("insert exercise", error);
      throw new Error("No se pudo guardar el ejercicio.");
    }

    await supabase.from("ai_generation_log").insert({
      user_id: userId,
      topic_id: topicId,
      difficulty,
      model: "google/gemini-3-flash-preview",
      status: "success",
      generated_exercise: JSON.parse(JSON.stringify(parsed)),
    });

    return {
      id: inserted.id as string,
      statement: parsed.statement,
      type: parsed.type,
      options: parsed.options ?? null,
      correct_answer: parsed.correct_answer,
      explanation: parsed.explanation,
      hints: parsed.hints,
      difficulty,
    };
  });
