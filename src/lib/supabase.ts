import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

// Created lazily so the build does not fail while the env values are still empty.
export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error("Supabase не настроен: заполните переменные окружения.");
  }
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
