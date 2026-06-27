import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { log } from "@/lib/observability/log";
import { generatePlan, STUDY_TOPICS, todayArgentina } from "@/lib/study/plan";

interface CompleteTaskInput {
  taskId: string;
}

interface ReplanInput {
  planId: string;
}

interface DeleteStudyPlanInput {
  planId: string;
}

interface CreateStudyPlanInput {
  name: string;
  examDate: string;
  topics: string[];
  dailyMinutes: number;
}

export interface CompleteTaskResult {
  completed: boolean;
  xpGain: number;
  newLevel: number | null;
  leveledUp: boolean;
}

type TaskRpcRow = {
  completed: boolean;
  xp_gain: number;
  new_level: number | null;
  leveled_up: boolean;
};

function mapTaskResult(row: TaskRpcRow): CompleteTaskResult {
  return {
    completed: row.completed,
    xpGain: row.xp_gain,
    newLevel: row.new_level,
    leveledUp: row.leveled_up,
  };
}

export const autoCompleteStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CompleteTaskInput) => input)
  .handler(async ({ data, context }): Promise<CompleteTaskResult> => {
    const { data: result, error } = await context.supabase.rpc("auto_complete_study_task", {
      p_task_id: data.taskId,
    });

    if (error) {
      log.error("study_task_auto_complete_rpc_failed", {
        error: error.message,
        taskId: data.taskId,
      });
      throw new Error("No se pudo completar la tarea.");
    }

    const row = Array.isArray(result) ? result[0] : null;
    if (!row) throw new Error("No se pudo completar la tarea.");
    return mapTaskResult(row);
  });

export const createStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateStudyPlanInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string; tasks: number }> => {
    const { name, examDate, topics, dailyMinutes } = data;
    const { supabase, userId } = context;
    const today = todayArgentina();

    if (!name.trim()) throw new Error("El nombre del examen es obligatorio.");
    if (!examDate || examDate <= today) throw new Error("La fecha del examen debe ser futura.");
    if (topics.length === 0) throw new Error("Elegí al menos un tema.");
    if (dailyMinutes <= 0) throw new Error("El tiempo diario debe ser mayor a cero.");

    const [{ data: prog }, { data: tps }] = await Promise.all([
      supabase.from("user_progress").select("topic_id, mastery_pct").eq("user_id", userId),
      supabase.from("topics").select("id, slug"),
    ]);

    const slugByTopic = new Map((tps ?? []).map((topic) => [topic.id, topic.slug]));
    const masteryBySlug = new Map<string, number>();
    for (const progress of prog ?? []) {
      const slug = slugByTopic.get(progress.topic_id);
      if (slug) masteryBySlug.set(slug, Number(progress.mastery_pct));
    }

    const planTopics = topics.map((slug) => ({
      slug,
      name: STUDY_TOPICS.find((topic) => topic.slug === slug)?.name ?? slug,
      mastery: masteryBySlug.get(slug) ?? 0,
    }));
    const tasks = generatePlan({ today, examDate, dailyMinutes, topics: planTopics });

    const { data: plan, error } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        name: name.trim(),
        exam_date: examDate,
        daily_minutes: dailyMinutes,
        topics,
      })
      .select("id")
      .single();

    if (error || !plan) {
      log.error("study_plan_create_failed", { error: error?.message ?? "missing_plan" });
      throw new Error("No se pudo crear el plan.");
    }

    const { error: tasksError } = await supabase.from("study_plan_tasks").insert(
      tasks.map((task) => ({
        plan_id: plan.id,
        user_id: userId,
        date: task.date,
        topic_slug: task.topicSlug,
        topic_name: task.topicName,
        kind: task.kind,
        title: task.title,
        objective: task.objective,
        minutes: task.minutes,
        order_index: task.orderIndex,
      })),
    );

    if (tasksError) {
      log.error("study_plan_tasks_create_failed", {
        error: tasksError.message,
        planId: plan.id,
        tasks: tasks.length,
      });
      throw new Error("No se pudieron crear las tareas del plan.");
    }

    return { id: plan.id, tasks: tasks.length };
  });

export const completeStudyTaskManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CompleteTaskInput) => input)
  .handler(async ({ data, context }): Promise<CompleteTaskResult> => {
    const { data: result, error } = await context.supabase.rpc("complete_study_task_manually", {
      p_task_id: data.taskId,
    });

    if (error) {
      log.error("study_task_manual_complete_rpc_failed", {
        error: error.message,
        taskId: data.taskId,
      });
      throw new Error(
        error.message.includes("future_task")
          ? "No se pueden completar tareas futuras."
          : "No se pudo marcar como hecha.",
      );
    }

    const row = Array.isArray(result) ? result[0] : null;
    if (!row) throw new Error("No se pudo marcar como hecha.");
    return mapTaskResult(row);
  });

export const replanStudyTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ReplanInput) => input)
  .handler(async ({ data, context }): Promise<{ updated: number }> => {
    const { data: result, error } = await context.supabase.rpc("replan_study_tasks", {
      p_plan_id: data.planId,
    });

    if (error) {
      log.error("study_tasks_replan_rpc_failed", { error: error.message, planId: data.planId });
      throw new Error("No se pudo replanificar.");
    }

    const row = Array.isArray(result) ? result[0] : null;
    return { updated: row?.updated ?? 0 };
  });

export const deleteStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DeleteStudyPlanInput) => input)
  .handler(async ({ data, context }): Promise<{ deleted: boolean }> => {
    const { error, count } = await context.supabase
      .from("study_plans")
      .delete({ count: "exact" })
      .eq("id", data.planId)
      .eq("user_id", context.userId);

    if (error) {
      log.error("study_plan_delete_failed", { error: error.message, planId: data.planId });
      throw new Error("No se pudo eliminar el plan.");
    }

    return { deleted: (count ?? 0) > 0 };
  });
