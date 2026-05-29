/**
 * Detección de patrones narrativos artificiales que la IA tiende a introducir:
 * "errores intencionales", correcciones ficticias, reinterpretaciones de la consigna,
 * cambios arbitrarios de pregunta a mitad de la explicación.
 *
 * Estos patrones contradicen el razonamiento matemático y degradan la calidad
 * pedagógica del ejercicio. Si se detectan, se dispara retry.
 */

interface ArtifactPattern {
  pattern: RegExp;
  label: string;
}

const ARTIFICIAL_PATTERNS: ArtifactPattern[] = [
  // Errores "intencionales" inventados por la IA
  { pattern: /error\s+intencional/i, label: "error intencional" },
  { pattern: /intencionalmente\s+(incorrecto|mal|erróne[ao]|falso)/i, label: "intencionalmente incorrecto" },
  { pattern: /a\s+propósito\s+(mal|incorrecto|erróne[ao])/i, label: "a propósito incorrecto" },
  { pattern: /deliberadamente\s+(mal|incorrecto|erróne[ao])/i, label: "deliberadamente incorrecto" },

  // Cambios de consigna / reinterpretaciones
  { pattern: /(modific|cambi)\w*\s+(la|el)\s+(consigna|pregunta|ejercicio|problema|enunciado)/i, label: "cambio de consigna" },
  { pattern: /reinterpret[oa]\s+(la|el)\s+(consigna|pregunta|problema)/i, label: "reinterpretación de consigna" },
  { pattern: /supongamos\s+que\s+en\s+realidad/i, label: "supongamos en realidad" },
  { pattern: /en\s+realidad\s+la\s+(pregunta|consigna|respuesta)\s+(era|es|sería)/i, label: "reinterpretación post-hoc" },

  // Correcciones ficticias
  { pattern: /corrección\s+ficticia/i, label: "corrección ficticia" },
  { pattern: /(me\s+)?(equivoqué|equivoco)\s+(a\s+propósito|intencionalmente|de\s+forma\s+intencional)/i, label: "equivocación intencional" },

  // Twists post-hoc: la respuesta no se deriva del razonamiento, sino de "interpretar" la consigna
  { pattern: /seg[uú]n\s+la\s+redacci[oó]n/i, label: "post-hoc 'según la redacción'" },
  { pattern: /seg[uú]n\s+el\s+enunciado,?\s+la\s+respuesta/i, label: "post-hoc 'según el enunciado'" },
  { pattern: /seg[uú]n\s+(la\s+)?(pregunta|consigna),?\s+la\s+respuesta/i, label: "post-hoc 'según la pregunta'" },
  { pattern: /reinterpretand[oa]/i, label: "reinterpretando" },
  { pattern: /interpretand[oa]\s+que\s+la\s+respuesta/i, label: "interpretando que la respuesta" },
  { pattern: /la\s+respuesta\s+(correcta\s+)?sería/i, label: "respuesta condicional 'sería'" },
  { pattern: /la\s+respuesta\s+buscada\s+(es|sería)/i, label: "respuesta buscada (post-hoc)" },
  { pattern: /pero\s+(en\s+verdad|en\s+realidad)\s+la\s+respuesta/i, label: "pero en realidad la respuesta" },
  { pattern: /(invirti[eé]ndo|invertir)\s+(la|el)\s+(resultado|valor|cociente|fracci[oó]n)/i, label: "inversión arbitraria del resultado" },
];

export function checkArtificialPatterns(
  text: string,
): { ok: true } | { ok: false; matched: string } {
  for (const { pattern, label } of ARTIFICIAL_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, matched: label };
    }
  }
  return { ok: true };
}
