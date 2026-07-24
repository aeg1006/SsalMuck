(() => {
  const config = window.SSALMUCK_CONFIG || {};
  const configured = config.SUPABASE_URL && config.SUPABASE_ANON_KEY &&
    !config.SUPABASE_URL.startsWith('YOUR_') && !config.SUPABASE_ANON_KEY.startsWith('YOUR_');
  window.ssalmuckConfigured = configured;
  window.ssalmuckSupabase = configured
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;
})();
