/* =========================================================
   AGENCY — Supabase connection
   Supabase Dashboard → Project Settings → API থেকে এই দুটো
   value বসান। এটা ছাড়া admin panel কাজ করবে না।
   ========================================================= */

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

/* Client তৈরি (supabase-js v2 CDN) */
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
