import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://aecutgfrlgcqvbrwbaqf.supabase.co";
const SUPABASE_KEY = "sb_publishable_MTsTXnZGpTabfeuKhbKyPQ_gBtuK1nF";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
