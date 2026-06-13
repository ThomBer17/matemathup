/**
 * API histórica de la página /tools/calculator. El motor real vive en calc-eval.ts
 * (evaluador unificado) y fraction.ts (formato). Se mantiene este módulo como
 * fachada para no tocar imports existentes ni sus tests.
 */
export { evaluate as evaluateExpression, type AngleMode, type EvalResult } from "./calc-eval";
export { formatNumber as formatResult } from "./fraction";
