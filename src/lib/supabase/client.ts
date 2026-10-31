import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "./config";

export function createClient() {
  const { url, key } = getSupabasePublicEnv();

  return createBrowserClient(url, key);
}
