export const DEFAULT_SUPABASE_URL = "https://drpsplylcnhmaevqprxp.supabase.co";
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_4O96y-vg7H4xJy-T6On9KQ_SCvj4H6e";
export const DEFAULT_SUPABASE_PROJECT_ID = "drpsplylcnhmaevqprxp";

export function getPublicSupabaseConfig() {
  const env = typeof process !== "undefined" ? process.env : {};

  return {
    url:
      import.meta.env.VITE_SUPABASE_URL ||
      env.SUPABASE_URL ||
      env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL,
    publishableKey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    projectId:
      import.meta.env.VITE_SUPABASE_PROJECT_ID ||
      env.VITE_SUPABASE_PROJECT_ID ||
      DEFAULT_SUPABASE_PROJECT_ID,
  };
}
