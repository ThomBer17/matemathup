// Diagnóstico: llama a Gemini con un prompt tipo generateExercise y muestra la
// respuesta cruda + intentos de parseo. Correr: node --env-file=.env scripts/diag-ai.mjs
const apiKey = process.env.AI_API_KEY;
const baseUrl = process.env.AI_BASE_URL;
const model = process.env.AI_MODEL;
if (!apiKey) { console.error("Falta AI_API_KEY"); process.exit(1); }

const systemPrompt = `Profesor de matemática secundaria argentina (5°-6°). Generás UN ejercicio en JSON.
NOTACIÓN (CRÍTICO): en "statement", "explanation" y "hints" escribí la matemática en LaTeX entre $...$ (se renderiza con KaTeX): $\\frac{a}{b}$, $\\sqrt{x}$, $x^2$, $\\theta$, $\\sin(\\alpha)$, $30^\\circ$. Display $$...$$ para un resultado clave.
PERO "correct_answer" y cada "options" van en notación SIMPLE tipeable, SIN $ ni LaTeX (ej: -3/4, x^2, sqrt(2), pi, 30) para poder compararlas con lo que tipea el alumno.`;

const userPrompt = `Ejercicio de "Trigonometría" dificultad muy fácil (1/5).
Conceptos: razones trigonométricas; identidades; resolución de triángulos.
JSON: {"statement","type":"multiple_choice"|"true_false"|"open","options":["..."],"correct_answer","explanation","hints":["pista"],"graph_expressions":[]}
- explanation: máx 3 pasos cortos
- hints: 1 sola pista sutil
Variá tipo y contexto.`;

const body = {
  model,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  response_format: { type: "json_object" },
  reasoning_effort: "none",
  max_tokens: 4096,
};

const t0 = Date.now();
const res = await fetch(baseUrl, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
console.log("HTTP", res.status, `${Date.now() - t0}ms`);
const json = await res.json();
if (!res.ok) { console.log("ERROR BODY:", JSON.stringify(json).slice(0, 800)); process.exit(0); }

const choice = json.choices?.[0];
const content = choice?.message?.content ?? "";
console.log("finish_reason:", choice?.finish_reason);
console.log("content length:", content.length);
console.log("---- RAW CONTENT ----");
console.log(content);
console.log("---- /RAW ----");

try {
  JSON.parse(content);
  console.log("PARSE crudo: OK");
} catch (e) {
  console.log("PARSE crudo: FALLA →", e.message);
}
