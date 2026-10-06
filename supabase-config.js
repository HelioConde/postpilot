// Configuração pública do Supabase para o PostPilot.
// Esta chave é publishable e foi feita para uso no navegador. Nunca use service_role no frontend.
(() => {
  const sdk = window.supabase;
  if (!sdk?.createClient) {
    window.POSTPILOT_SUPABASE = { client: null };
    return;
  }
  const url = 'https://bnlvvsjgpywpbfhwdcan.supabase.co';
  const publishableKey = 'sb_publishable_8q954VgGB7IUEgwWYA55-Q_MUyDd17c';
  window.POSTPILOT_SUPABASE = {
    url,
    publishableKey,
    client: sdk.createClient(
      url,
      publishableKey,
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
