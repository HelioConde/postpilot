// Configuração pública do Supabase para o PostPilot.
// Esta chave é publishable e foi feita para uso no navegador. Nunca use service_role no frontend.
(() => {
  const sdk = window.supabase;
  if (!sdk?.createClient) {
    window.POSTPILOT_SUPABASE = { client: null };
    return;
  }
  window.POSTPILOT_SUPABASE = {
    client: sdk.createClient(
      'https://bnlvvsjgpywpbfhwdcan.supabase.co',
      'sb_publishable_8q954VgGB7IUEgwWYA55-Q_MUyDd17c',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  };
})();
