// ============================================================
// supabase.ts — Supabase Client Initialization
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[PhysioBuddy] ⚠️ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check your .env file',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
