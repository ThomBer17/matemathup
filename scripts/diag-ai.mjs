// Diagnóstico: llama a Gemini con un prompt tipo generateExercise, muestra la
// respuesta cruda y prueba las MISMAS etapas de reparación que usa el server.
//
// Uso: pegá tu key REAL en .env (AI_API_KEY=...) y corré:
//   node --env-file=.env scripts/diag-ai.mjs
const apiKey = process.env.AI_API_KEY;
const baseUrl = process.env.AI_BASE_URL;
const model = process.env.AI_MODEL;
if (!apiKey || apiKey.includes("PEGÁ")) {
  console.error("Falta una AI_API_KEY real en .env (la actual es un placeholder).");
  process.exit(1);
}

// ---- copias de las funciones del server (src/lib/ai/service.ts) ----
function extractJson(raw) {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const fO = s.indexOf("{"), fA = s.indexOf("[");
  const start = fO === -1 ? fA : fA === -1 ? fO : Math.min(fO, fA);
  if (start === -1) return s;
  const close = s[start] === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  return end === -1 || end < start ? s.slice(start) : s.slice(start, end + 1);
}
function fixJsonBackslashes(raw) {
  let out = "", inStr = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (!inStr) { out += ch; if (ch === '"') inStr = true; continue; }
    if (ch === '"') { out += ch; inStr = false; continue; }
    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === undefined) { out += "\\\\"; continue; }
      if (next === '"' || next === "\\" || next === "/") { out += ch + next; i++; continue; }
      if (next === "u" && /^[0-9a-fA-F]{4}$/.test(raw.slice(i + 2, i + 6))) { out += ch; continue; }
      out += "\\\\"; continue;
    }
    if (ch === "\n") { out += "\\n"; continue; }
    if (ch === "\r") { out += "\\r"; continue; }
    if (ch === "\t") { out += "\\t"; continue; }
    out += ch;
  }
  return out;
}
function repairJson(raw) {
  let s = raw.trim().replace(/,\s*([}\]])/g, "$1");
  const stack = []; let inStr = false, esc = false;
  for (const ch of s) {
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) s += '"';
  s = s.replace(/,\s*$/, "");
  while (stack.length) s += stack.pop() === "{" ? "}" : "]";
  return s;
}

const systemPrompt = `Profesor de matemática secundaria argentina (5°-6°). Generás UN ejercicio en JSON.
NOTACIÓN (CRÍTICO): en "statement", "explanation" y "hints" escribí la matemática en LaTeX entre $...$ (se renderiza con KaTeX): $\\frac{a}{b}$, $\\sqrt{x}$, $x^2$, $\\theta$, $\\sin(\\alpha)$, $30^\\circ$. Display $$...$$ para un resultado clave.
PERO "correct_answer" y cada "options" van en notación SIMPLE tipeable, SIN $ ni LaTeX.`;
const userPrompt = `Ejercicio de "Trigonometría" dificultad muy fácil (1/5).
JSON: {"statement","type":"multiple_choice"|"true_false"|"open","options":["..."],"correct_answer","explanation","hints":["pista"],"graph_expressions":[]}
- explanation: máx 3 pasos cortos`;

const body = {
  model,
  messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  response_format: { type: "json_object" },
  reasoning_effort: "none",
  max_tokens: 8192,
};

for (let i = 1; i <= 3; i++) {
  const t0 = Date.now();
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`\n===== INTENTO ${i} — HTTP ${res.status} (${Date.now() - t0}ms) =====`);
  const json = await res.json();
  if (!res.ok) { console.log("ERROR:", JSON.stringify(json).slice(0, 500)); continue; }
  const choice = json.choices?.[0];
  const content = choice?.message?.content ?? "";
  console.log("finish_reason:", choice?.finish_reason, "| length:", content.length);
  console.log("---- RAW ----\n" + content + "\n---- /RAW ----");
  const slice = extractJson(content);
  const stages = { crudo: slice, escaped: fixJsonBackslashes(slice), "repair(escaped)": repairJson(fixJsonBackslashes(slice)) };
  for (const [name, cand] of Object.entries(stages)) {
    try { JSON.parse(cand); console.log(`  [${name}] PARSE OK`); }
    catch (e) { console.log(`  [${name}] FALLA → ${e.message}`); }
  }
}
