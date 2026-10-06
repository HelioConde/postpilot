import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const BUCKET = "postpilot-media";
const MAX_BYTES = 6 * 1024 * 1024;
const allowedOrigins = new Set([
  "https://helioconde.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:4175",
]);
const allowedMime = new Set([
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime",
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

async function consumeQuota(url: string, userId: string) {
  const key = getSecretKey();
  if (!key) return null;
  const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await service.rpc("postpilot_consume_usage", {
    p_user_id: userId,
    p_feature: "transcription",
    p_limit: 10,
  });
  if (error || !Array.isArray(data) || !data.length) return null;
  const row = data[0] as Record<string, unknown>;
  return {
    allowed: Boolean(row.allowed),
    remaining: Math.max(0, Number(row.remaining) || 0),
    resetAt: typeof row.reset_at === "string" ? row.reset_at : "",
  };
}

async function readQuotaStatus(url: string, userId: string) {
  const key = getSecretKey();
  if (!key) return null;
  const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await service.rpc("postpilot_usage_status", {
    p_user_id: userId,
    p_feature: "transcription",
    p_limit: 10,
  });
  if (error || !Array.isArray(data) || !data.length) return null;
  const row = data[0] as Record<string, unknown>;
  return {
    remaining: Math.max(0, Number(row.remaining) || 0),
    resetAt: typeof row.reset_at === "string" ? row.reset_at : "",
  };
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function cleanSegments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 500).map((segment) => {
    const row = segment && typeof segment === "object" && !Array.isArray(segment)
      ? segment as Record<string, unknown>
      : {};
    const start = Number(row.start);
    const end = Number(row.end);
    const text = cleanText(row.text, 800);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || !text) return null;
    return {
      start: Math.round(start * 100) / 100,
      end: Math.round(end * 100) / 100,
      text,
    };
  }).filter(Boolean);
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json(405, { error: "Método não permitido." }, origin);
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: "Origem não permitida." }, origin);

  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Autenticação obrigatória." }, origin);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json(503, { error: "Serviço indisponível." }, origin);

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json(401, { error: "Sessão inválida." }, origin);

  let input: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(400, { error: "Arquivo inválido." }, origin);
    }
    input = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Arquivo inválido." }, origin);
  }

  const apiUrl = Deno.env.get("POSTPILOT_TRANSCRIBE_API_URL");
  const apiKey = Deno.env.get("POSTPILOT_TRANSCRIBE_API_KEY");
  const model = Deno.env.get("POSTPILOT_TRANSCRIBE_MODEL");
  if (input.action === "health") {
    const quotaStatus = await readQuotaStatus(url, user.id);
    return json(200, {
      ok: true,
      configured: Boolean(apiUrl && apiKey && model),
      feature: "transcription",
      hourlyLimit: 10,
      remaining: quotaStatus?.remaining ?? 10,
      resetAt: quotaStatus?.resetAt || "",
      maxBytes: MAX_BYTES,
    }, origin);
  }

  const path = cleanText(input.path, 400);
  if (!path || !path.startsWith(user.id + "/") || path.includes("..")) {
    return json(403, { error: "Arquivo não permitido." }, origin);
  }

  const { data: file, error: fileError } = await client.storage.from(BUCKET).download(path);
  if (fileError || !file) return json(404, { error: "Arquivo não encontrado." }, origin);
  if (file.size > MAX_BYTES) return json(413, { error: "Arquivo maior que 6 MB." }, origin);

  const mime = file.type || "application/octet-stream";
  if (!allowedMime.has(mime)) return json(415, { error: "Formato de mídia não suportado." }, origin);

  if (!apiUrl || !apiKey || !model) {
    return json(503, { error: "Transcrição automática ainda não configurada." }, origin);
  }

  const quota = await consumeQuota(url, user.id);
  if (!quota) return json(503, { error: "Controle de uso indisponível." }, origin);
  if (!quota.allowed) {
    return json(429, {
      error: "Limite horário de transcrição atingido.",
      rateLimit: { remaining: 0, resetAt: quota.resetAt },
    }, origin);
  }

  const form = new FormData();
  form.append("file", file, cleanText(input.name, 180) || "media");
  form.append("model", model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  const language = input.locale === "en" ? "en" : "pt";
  form.append("language", language);

  let providerResponse: Response;
  try {
    providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey },
      body: form,
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    return json(503, { error: "Serviço de transcrição indisponível." }, origin);
  }

  if (!providerResponse.ok) return json(503, { error: "Não foi possível transcrever a mídia." }, origin);

  let payload: Record<string, unknown>;
  try {
    payload = await providerResponse.json();
  } catch {
    return json(502, { error: "Resposta de transcrição inválida." }, origin);
  }

  const transcript = cleanText(payload.text, 12000);
  const segments = cleanSegments(payload.segments);
  if (!transcript) return json(502, { error: "A transcrição retornou vazia." }, origin);

  return json(200, {
    ok: true,
    transcript,
    segments,
    rateLimit: { remaining: quota.remaining, resetAt: quota.resetAt },
  }, origin);
});
