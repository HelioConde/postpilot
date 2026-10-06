import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const allowedOrigins = new Set([
  "https://helioconde.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:4175",
]);

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function getSecretKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed: unknown = JSON.parse(secretKeys);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const key = (parsed as Record<string, unknown>).default;
        if (typeof key === "string" && key) return key;
      }
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json(405, { error: "Método não permitido." }, origin);
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: "Origem não permitida." }, origin);

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(400, { error: "Feedback inválido." }, origin);
    }
    input = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Feedback inválido." }, origin);
  }

  if (cleanText(input.website, 80)) return json(202, { ok: true }, origin);

  const rating = Number(input.rating);
  const category = cleanText(input.category, 24);
  const comment = cleanText(input.comment, 500);
  const locale = input.locale === "en" ? "en" : "pt-BR";
  const viewport = ["mobile", "tablet", "desktop"].includes(String(input.viewport))
    ? String(input.viewport)
    : "desktop";
  const displayMode = input.displayMode === "standalone" ? "standalone" : "browser";
  const appVersion = cleanText(input.appVersion, 30);
  const clientCreatedAt = typeof input.createdAt === "string" && !Number.isNaN(Date.parse(input.createdAt))
    ? new Date(input.createdAt).toISOString()
    : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json(400, { error: "Nota inválida." }, origin);
  }
  if (!["usability", "quality", "bug", "idea", "other"].includes(category)) {
    return json(400, { error: "Categoria inválida." }, origin);
  }
  if (comment.length < 2) return json(400, { error: "Comentário muito curto." }, origin);

  const url = Deno.env.get("SUPABASE_URL");
  const key = getSecretKey();
  if (!url || !key) return json(503, { error: "Serviço indisponível." }, origin);

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.from("postpilot_beta_feedback").insert({
    rating,
    category,
    comment,
    locale,
    viewport,
    display_mode: displayMode,
    was_online: Boolean(input.online),
    app_version: appVersion,
    client_created_at: clientCreatedAt,
  });

  if (error) return json(503, { error: "Não foi possível salvar o feedback." }, origin);
  return json(201, { ok: true }, origin);
});
