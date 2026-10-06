import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const allowedOrigins = new Set([
  "https://helioconde.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:4175",
]);

const allowedPlatforms = new Set(["Instagram", "TikTok", "YouTube Shorts"]);
const allowedGoals = new Set(["conversa", "alcance", "oferta"]);
const allowedTones = new Set(["natural", "didatico", "humor"]);

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
    p_feature: "ai_generation",
    p_limit: 20,
  });
  if (error || !Array.isArray(data) || !data.length) return null;
  const row = data[0] as Record<string, unknown>;
  return {
    allowed: Boolean(row.allowed),
    remaining: Math.max(0, Number(row.remaining) || 0),
    resetAt: typeof row.reset_at === "string" ? row.reset_at : "",
  };
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function extractJsonText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === "string") return data.output_text;
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;
  if (typeof message?.content === "string") return message.content;
  return "";
}

function sanitizeGenerated(raw: unknown, platforms: string[]) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = (raw as Record<string, unknown>).platforms;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;

  const output: Record<string, { lines: Array<{ label: string; value: string }> }> = {};
  for (const platform of platforms) {
    const item = (source as Record<string, unknown>)[platform];
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const lines = (item as Record<string, unknown>).lines;
    if (!Array.isArray(lines) || lines.length < 3 || lines.length > 6) return null;
    const cleaned = lines.map((line) => {
      const record = line && typeof line === "object" && !Array.isArray(line)
        ? line as Record<string, unknown>
        : {};
      return {
        label: cleanText(record.label, 60),
        value: cleanText(record.value, 1600),
      };
    }).filter((line) => line.label && line.value);
    if (cleaned.length < 3) return null;
    output[platform] = { lines: cleaned };
  }
  return { platforms: output };
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json(503, { error: "Serviço indisponível." }, origin);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json(401, { error: "Sessão inválida." }, origin);

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(400, { error: "Briefing inválido." }, origin);
    }
    input = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Briefing inválido." }, origin);
  }

  const apiKey = Deno.env.get("POSTPILOT_AI_API_KEY");
  const apiUrl = Deno.env.get("POSTPILOT_AI_API_URL");
  const model = Deno.env.get("POSTPILOT_AI_MODEL");
  if (input.action === "health") {
    return json(200, {
      ok: true,
      configured: Boolean(apiKey && apiUrl && model),
      feature: "ai_generation",
      hourlyLimit: 20,
    }, origin);
  }

  const topic = cleanText(input.topic, 140);
  const transcript = cleanText(input.transcript, 12000);
  const audience = cleanText(input.audience, 120);
  const locale = input.locale === "en" ? "en" : "pt-BR";
  const tone = allowedTones.has(String(input.tone)) ? String(input.tone) : "natural";
  const goal = allowedGoals.has(String(input.goal)) ? String(input.goal) : "conversa";
  const platforms = Array.isArray(input.platforms)
    ? [...new Set(input.platforms.map(String).filter((item) => allowedPlatforms.has(item)))].slice(0, 3)
    : [];

  if (topic.length < 2 || transcript.length < 20 || !platforms.length) {
    return json(400, { error: "Briefing incompleto." }, origin);
  }

  if (!apiKey || !apiUrl || !model) {
    return json(503, { error: "Geração por IA ainda não configurada." }, origin);
  }

  const quota = await consumeQuota(supabaseUrl, userData.user.id);
  if (!quota) return json(503, { error: "Controle de uso indisponível." }, origin);
  if (!quota.allowed) {
    return json(429, {
      error: "Limite horário de IA atingido.",
      rateLimit: { remaining: 0, resetAt: quota.resetAt },
    }, origin);
  }

  const language = locale === "en" ? "English" : "Brazilian Portuguese";
  const system = [
    "You are PostPilot, an editorial assistant for short-form creators.",
    "Return only valid JSON. Never use markdown fences.",
    "Ground the copy in the supplied transcript; do not invent facts.",
    "Write in " + language + ".",
    "For each requested platform return 3 to 6 concise fields in the exact schema:",
    '{"platforms":{"Instagram":{"lines":[{"label":"...","value":"..."}]}}}',
    "Keep hooks specific, CTAs proportional to the goal, and hashtags relevant rather than spammy."
  ].join("\n");

  const user = JSON.stringify({ topic, transcript, audience, tone, goal, platforms, locale });
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return json(503, { error: "Fornecedor de IA indisponível." }, origin);
  }

  if (!response.ok) return json(503, { error: "Não foi possível gerar com IA." }, origin);

  let providerPayload: unknown;
  try {
    providerPayload = await response.json();
  } catch {
    return json(502, { error: "Resposta inválida do fornecedor." }, origin);
  }

  const rawText = extractJsonText(providerPayload);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return json(502, { error: "A IA retornou um formato inválido." }, origin);
  }

  const generated = sanitizeGenerated(parsed, platforms);
  if (!generated) return json(502, { error: "A IA retornou um pacote incompleto." }, origin);

  return json(200, {
    ok: true,
    generation: generated,
    provider: "configured",
    rateLimit: { remaining: quota.remaining, resetAt: quota.resetAt },
  }, origin);
});
