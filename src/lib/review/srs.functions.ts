import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { log } from "@/lib/observability/log";
import { applyReview, type SrsState } from "./srs";

interface GradeReviewItemInput {
  itemId: string;
  knewIt: boolean;
}

export const gradeReviewItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GradeReviewItemInput) => input)
  .handler(async ({ data, context }): Promise<{ nextBox: number; nextDueAt: string }> => {
    const { data: item, error: readError } = await context.supabase
      .from("srs_items")
      .select("box, due_at, reviews")
      .eq("id", data.itemId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (readError || !item) {
      log.error("review_item_read_failed", {
        error: readError?.message ?? "missing_item",
        itemId: data.itemId,
      });
      throw new Error("No se pudo actualizar el repaso.");
    }

    const prev: SrsState = {
      box: item.box,
      dueAt: item.due_at,
      reviews: item.reviews,
    };
    const next = applyReview(prev, data.knewIt);

    const { error: updateError } = await context.supabase
      .from("srs_items")
      .update({
        box: next.box,
        due_at: next.dueAt,
        reviews: next.reviews,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.itemId)
      .eq("user_id", context.userId);

    if (updateError) {
      log.error("review_item_update_failed", { error: updateError.message, itemId: data.itemId });
      throw new Error("No se pudo actualizar el repaso.");
    }

    return { nextBox: next.box, nextDueAt: next.dueAt };
  });
