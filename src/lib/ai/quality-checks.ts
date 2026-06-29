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
  {
    pattern: /intencionalmente\s+(incorrecto|mal|erróne[ao]|falso)/i,
    label: "intencionalmente incorrecto",
  },
  { pattern: /a\s+propósito\s+(mal|incorrecto|erróne[ao])/i, label: "a propósito incorrecto" },
  {
    pattern: /deliberadamente\s+(mal|incorrecto|erróne[ao])/i,
    label: "deliberadamente incorrecto",
  },

  // Cambios de consigna / reinterpretaciones
  {
    pattern: /(modific|cambi)\w*\s+(la|el)\s+(consigna|pregunta|ejercicio|problema|enunciado)/i,
    label: "cambio de consigna",
  },
  {
    pattern: /reinterpret[oa]\s+(la|el)\s+(consigna|pregunta|problema)/i,
    label: "reinterpretación de consigna",
  },
  { pattern: /\boops\b/i, label: "oops/recalculo informal" },
  { pattern: /\brevisemos\b/i, label: "revisemos corrección post-hoc" },
  { pattern: /\brecalc\b/i, label: "recalculo post-hoc" },
  { pattern: /supongamos\s+que\s+en\s+realidad/i, label: "supongamos en realidad" },
  {
    pattern: /en\s+realidad\s+la\s+(pregunta|consigna|respuesta)\s+(era|es|sería)/i,
    label: "reinterpretación post-hoc",
  },

  // Correcciones ficticias
  { pattern: /corrección\s+ficticia/i, label: "corrección ficticia" },
  {
    pattern:
      /(me\s+)?(equivoqué|equivoco)\s+(a\s+propósito|intencionalmente|de\s+forma\s+intencional)/i,
    label: "equivocación intencional",
  },

  // Twists post-hoc: la respuesta no se deriva del razonamiento, sino de "interpretar" la consigna
  { pattern: /seg[uú]n\s+la\s+redacci[oó]n/i, label: "post-hoc 'según la redacción'" },
  {
    pattern: /seg[uú]n\s+el\s+enunciado,?\s+la\s+respuesta/i,
    label: "post-hoc 'según el enunciado'",
  },
  {
    pattern: /seg[uú]n\s+(la\s+)?(pregunta|consigna),?\s+la\s+respuesta/i,
    label: "post-hoc 'según la pregunta'",
  },
  { pattern: /reinterpretand[oa]/i, label: "reinterpretando" },
  { pattern: /interpretand[oa]\s+que\s+la\s+respuesta/i, label: "interpretando que la respuesta" },
  { pattern: /la\s+respuesta\s+(correcta\s+)?sería/i, label: "respuesta condicional 'sería'" },
  { pattern: /la\s+respuesta\s+buscada\s+(es|sería)/i, label: "respuesta buscada (post-hoc)" },
  {
    pattern: /pero\s+(en\s+verdad|en\s+realidad)\s+la\s+respuesta/i,
    label: "pero en realidad la respuesta",
  },
  {
    pattern: /(invirti[eé]ndo|invertir)\s+(la|el)\s+(resultado|valor|cociente|fracci[oó]n)/i,
    label: "inversión arbitraria del resultado",
  },
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

/**
 * Detección de MUTACIÓN DE CONSIGNA: la IA cambia el problema (divisor, signo,
 * datos) para forzar coincidencia con una answer key esperada, en vez de respetar
 * la matemática. La consigna es inmutable una vez generada.
 */
const STATEMENT_MUTATION_PATTERNS: ArtifactPattern[] = [
  { pattern: /\bcorrij\w+\b/i, label: "corrijamos/corregir la consigna" },
  { pattern: /\brevisemos\b/i, label: "revisemos corrección post-hoc" },
  { pattern: /\boops\b/i, label: "oops/recalculo informal" },
  {
    pattern: /\bla\s+respuesta\s+esperada\s+(era|es|deber[ií]a)\b/i,
    label: "la respuesta esperada era",
  },
  { pattern: /\bel\s+resultado\s+esperado\s+(era|es)\b/i, label: "el resultado esperado era" },
  { pattern: /\bseg[uú]n\s+lo\s+esperado\b/i, label: "según lo esperado" },
  { pattern: /\bcomo\s+se\s+esperaba\b/i, label: "como se esperaba" },
  { pattern: /\bpara\s+que\s+(coincida|d[eé]|sea|cuadre)\b/i, label: "para que coincida" },
  // Sustitución de un operando/dato por otro: "usar (x+2) en vez de (x-2)"
  {
    pattern:
      /\b(us\w+|usemos|tom\w+|cambi\w+|reemplac\w+|consider\w+)\b[^.]{0,40}\ben\s+(vez|lugar)\s+de\b/i,
    label: "sustituir dato en vez de",
  },
  {
    pattern: /\ben\s+(vez|lugar)\s+de\b[^.]{0,40}\b(divisor|el signo|la ecuaci[oó]n|x\s*[-+])/i,
    label: "cambiar divisor/signo en vez de",
  },
  {
    pattern: /\bdeber[ií]a\s+(ser|dar)\b[^.]{0,30}\bas[ií]\s+que\b/i,
    label: "debería ser X así que",
  },
  { pattern: /\bredefin\w+\s+(el|la|los)\b/i, label: "redefinir la consigna" },
];

export function checkStatementMutation(
  text: string,
): { ok: true } | { ok: false; matched: string } {
  for (const { pattern, label } of STATEMENT_MUTATION_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, matched: label };
    }
  }
  return { ok: true };
}

/**
 * Multiple choice: la IA calcula bien pero, al no coincidir ninguna opción,
 * elige "la más cercana" y la marca como correcta. Eso es un ejercicio roto.
 * Patrones acotados al contexto de opciones para no falsear positivos
 * (ej. "el punto más cercano al origen" en geometría es legítimo).
 */
const CLOSEST_OPTION_PATTERNS: ArtifactPattern[] = [
  {
    pattern:
      /\bninguna\s+(de\s+las\s+)?opci[oó]n(es)?\s+(coincide|es\s+correcta|es\s+exacta|es\s+igual)/i,
    label: "ninguna opción coincide",
  },
  {
    pattern:
      /\b(opci[oó]n|respuesta|alternativa)\s+m[aá]s\s+(cercana|parecida|pr[oó]xima|similar)\b/i,
    label: "opción más cercana/parecida",
  },
  { pattern: /\bla\s+m[aá]s\s+(cercana|parecida)\s+(es|ser[ií]a)\b/i, label: "la más cercana es" },
  { pattern: /\baproximadamente\s+coincide\b/i, label: "aproximadamente coincide" },
  { pattern: /\bes\s+la\s+opci[oó]n\s+esperada\b/i, label: "es la opción esperada" },
  { pattern: /\baunque\s+no\s+coincid\w*\b/i, label: "aunque no coincide exactamente" },
  {
    pattern: /\bopci[oó]n\s+que\s+m[aá]s\s+se\s+(acerca|aproxima|asemeja)\b/i,
    label: "opción que más se acerca",
  },
];

export function checkClosestOptionFraud(
  text: string,
): { ok: true } | { ok: false; matched: string } {
  for (const { pattern, label } of CLOSEST_OPTION_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, matched: label };
    }
  }
  return { ok: true };
}

/**
 * RACIONALIZACIÓN MATEMÁTICA: la IA calcula bien (ej. 43.55 m), ve que la answer
 * key / las opciones dicen otra cosa (43.59 m) y, en lugar de invalidar el ejercicio,
 * intenta "negociar con la matemática": ajusta/modifica las opciones, asume un error,
 * back-solvea una constante (tan(40°)) o justifica la respuesta incorrecta.
 *
 * LA MATEMÁTICA MANDA: si resultado ≠ explicación ≠ answer key, el ejercicio es
 * INVÁLIDO y debe regenerarse. Nunca mostrar al alumno este tipo de explicación.
 *
 * Detecta tanto español como inglés (el modelo a veces razona en inglés: "recalculating
 * and adjusting options"). Se ancla a "opciones"/"respuesta" para no falsear positivos
 * con usos legítimos de "ajustar" (ej. ajustar una recta por regresión).
 */
const MATH_RATIONALIZATION_PATTERNS: ArtifactPattern[] = [
  // --- Manipular las opciones para que encajen con el resultado (o viceversa) ---
  {
    pattern:
      /\b(ajust|reajust|modific|cambi|corrij|adapt|reescrib|recalcul)\w*\b[^.]{0,30}\b(las\s+)?opci[oó]n(es)?\b/i,
    label: "ajustar/modificar las opciones",
  },
  { pattern: /\bgenerar\s+(una\s+)?opci[oó]n\s+correcta\b/i, label: "generar una opción correcta" },
  { pattern: /\blas\s+opci[oó]n(es)?\s+originales?\b/i, label: "las opciones originales" },
  {
    pattern: /\bopci[oó]n(es)?\s+(no\s+(parecen|son)\s+(precisas|exactas|correctas)|imprecisas)\b/i,
    label: "las opciones no son precisas",
  },
  {
    pattern:
      /\bpara\s+que\s+(la\s+)?(respuesta|opci[oó]n)\s+\w*\s*(correcta|sea|coincida|cuadre)\b/i,
    label: "para que la respuesta/opción sea correcta",
  },

  // --- Asumir errores / cambiar parámetros del problema para salvar la inconsistencia ---
  {
    pattern: /\bsi\s+asumimos\s+(un\s+|que\s+hay\s+un\s+)?error\b/i,
    label: "si asumimos un error",
  },
  {
    pattern:
      /\bsi\s+(usamos|us[aá]ramos|tomamos|tom[aá]ramos)\s+(otro|un\s+(valor\s+)?(diferente|distinto))\b/i,
    label: "si usamos otro valor",
  },
  {
    pattern: /\b(valor\s+)?(diferente|distinto)\s+de\s+(sen|cos|tan|tg|sin|cot|sec|csc|log|ln)\b/i,
    label: "back-solving de una función (valor distinto de tan/sen…)",
  },
  {
    pattern: /\b(necesito|debo|tengo\s+que|hay\s+que|deber[ií]a)\s+ajustar\b/i,
    label: "necesito/debo ajustar",
  },

  // --- Elegir la más cercana (también cubierto en closest, pero acá aplica a todo tipo) ---
  {
    pattern:
      /\b(opci[oó]n|respuesta|alternativa)\s+m[aá]s\s+(cercana|parecida|pr[oó]xima|similar)\b/i,
    label: "opción más cercana/parecida",
  },

  // --- Inglés: el modelo a veces razona/escribe en inglés ---
  {
    pattern:
      /\b(recalculat\w+|adjust\w+|modify\w*|chang\w+|regenerat\w+)\b[^.]{0,30}\b(the\s+)?options?\b/i,
    label: "adjusting options (en)",
  },
  { pattern: /\bclosest\s+(option|answer|match|value)\b/i, label: "closest option (en)" },
  {
    pattern: /\bif\s+we\s+assume\s+(an?\s+|there\s+is\s+an?\s+)?error\b/i,
    label: "if we assume an error (en)",
  },
];

export function checkMathematicalRationalization(
  text: string,
): { ok: true } | { ok: false; matched: string } {
  for (const { pattern, label } of MATH_RATIONALIZATION_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, matched: label };
    }
  }
  return { ok: true };
}
