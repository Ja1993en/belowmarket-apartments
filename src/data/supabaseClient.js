import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isLocalFallbackEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === "true";

export const localFallbackMessage =
  "Supabase could not be reached. Showing local fallback data.";
