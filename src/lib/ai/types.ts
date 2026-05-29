export type DifficultyLevel = "básico" | "intermedio" | "alto";

export interface Activity {
  titulo: string;
  enunciado: string;
}

export interface GeneratedActivities {
  tema: string;
  nivel: DifficultyLevel;
  actividades: Activity[];
}

export type EvaluationStatus = "correcta" | "incorrecta" | "parcial";

export interface EvaluationResult {
  estado: EvaluationStatus;
  feedback: string;
  explicacion: string;
}

export interface HintResult {
  pista: string;
}

// Opción B — scaffold para futuras capacidades del tutor
export interface ActivityWithSolution extends Activity {
  respuesta_correcta: string;
  explicacion: string;
  pistas: string[];
}
