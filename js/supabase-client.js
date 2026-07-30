(() => {
  "use strict";

  const config = window.THEPETGRID_SUPABASE || {};
  const isConfigured =
    typeof config.url === "string" &&
    config.url.startsWith("https://") &&
    !config.url.includes("PASTE_YOUR_") &&
    typeof config.publishableKey === "string" &&
    config.publishableKey.length > 20 &&
    !config.publishableKey.includes("PASTE_YOUR_");

  if (!isConfigured) {
    window.ThePetGridSupabase = {
      client: null,
      isConfigured: false
    };
    console.info("ThePetGrid: Supabase is ready but not configured yet.");
    return;
  }

  if (!window.supabase?.createClient) {
    console.error("ThePetGrid: supabase-js failed to load.");
    window.ThePetGridSupabase = { client: null, isConfigured: false };
    return;
  }

  const client = window.supabase.createClient(
    config.url,
    config.publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  window.ThePetGridSupabase = {
    client,
    isConfigured: true
  };
})();
