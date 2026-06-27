// Diagnóstico de la IA. Pasá tu key de Gemini como argumento (no hace falta tocar .env):
//   node scripts/diag-ai.mjs TU_API_KEY
// Prueba varias configuraciones para aislar la causa del "formato inválido".
const apiKey =
  process.argv[2] ||
  (process.env.AI_API_KEY && !process.env.AI_API_KEY.includes("PEGÁ")
    ? process.env.AI_API_KEY
    : null);
const baseUrl =
  process.env.AI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const model = process.env.AI_MODEL || "gemini-2.5-flash";
if (!apiKey) {
  console.error("Uso: node scripts/diag-ai.mjs TU_API_KEY");
  process.exit(1);
}

// ---- reparadores (copia de src/lib/ai/service.ts) ----
function extractJson(raw) {
  let s = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const fO = s.indexOf("{"),
    fA = s.indexOf("[");
  const start = fO === -1 ? fA : fA === -1 ? fO : Math.min(fO, fA);
  if (start === -1) return s;
  const close = s[start] === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  return end === -1 || end < start ? s.slice(start) : s.slice(start, end + 1);
}
function fixJsonBackslashes(raw) {
  let out = "",
    inStr = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (!inStr) {
      out += ch;
      if (ch === '"') inStr = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inStr = false;
      continue;
    }
    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === undefined) {
        out += "\\\\";
        continue;
      }
      if (next === '"' || next === "\\" || next === "/") {
        out += ch + next;
        i++;
        continue;
      }
      if (next === "u" && /^[0-9a-fA-F]{4}$/.test(raw.slice(i + 2, i + 6))) {
        out += ch;
        continue;
      }
      if (next === "n" && !/[a-z]/.test(raw[i + 2] ?? "")) {
        out += "\\n";
        i++;
        continue;
      }
      out += "\\\\";
      continue;
    }
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }
    if (ch === "\t") {
      out += "\\t";
      continue;
    }
    out += ch;
  }
  return out;
}

const systemPrompt = `Profesor de matemática secundaria argentina. Generás UN ejercicio en JSON.
En "statement", "explanation" y "hints" usá LaTeX entre $...$. "correct_answer" y "options" en texto plano tipeable.`;
const userPrompt = `Ejercicio de "Trigonometría" dificultad muy fácil.
JSON: {"statement","type":"multiple_choice"|"true_false"|"open","options":["..."],"correct_answer","explanation","hints":["pista"],"graph_expressions":[]}`;

const baseBody = {
  model,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  response_format: { type: "json_object" },
};

const configs = [
  {
    name: "A: reasoning_effort=none + max_tokens=8192",
    extra: { reasoning_effort: "none", max_tokens: 8192 },
  },
  { name: "B: SIN reasoning_effort, max_tokens=8192", extra: { max_tokens: 8192 } },
  { name: "C: mínima (sin extras)", extra: {} },
];

for (const cfg of configs) {
  const body = { ...baseBody, ...cfg.extra };
  const t0 = Date.now();
  let res, json;
  try {
    res = await fetch(baseUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    json = await res.json();
  } catch (e) {
    console.log(`\n### ${cfg.name}\nFETCH ERROR: ${e.message}`);
    continue;
  }
  console.log(`\n### ${cfg.name}  →  HTTP ${res.status} (${Date.now() - t0}ms)`);
  if (!res.ok) {
    console.log("ERROR:", JSON.stringify(json).slice(0, 400));
    continue;
  }
  const choice = json.choices?.[0];
  const content = choice?.message?.content ?? "";
  console.log(`finish_reason: ${choice?.finish_reason} | length: ${content.length}`);
  const slice = extractJson(content);
  const stages = { crudo: slice, escaped: fixJsonBackslashes(slice) };
  for (const [n, c] of Object.entries(stages)) {
    try {
      JSON.parse(c);
      console.log(`  parse(${n}): OK`);
    } catch (e) {
      console.log(`  parse(${n}): FALLA → ${e.message}`);
    }
  }
  console.log("  primeros 240 chars:", content.slice(0, 240).replace(/\n/g, "\\n"));
}
