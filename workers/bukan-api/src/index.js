/**
 * Public 武鑑 Gi proxy.
 * GET /health
 * GET /v1/bukan?wallet=0x…  → local bot API (BUKAN_UPSTREAM + BUKAN_API_KEY)
 *
 * 旗手/加勢/義援 are read in the browser from the public Sukedachi Worker
 * (Workers cannot fetch other *.workers.dev — CF 1042).
 *
 * Never returns Discord username / user_id.
 */
function corsHeaders(env, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ok = !origin || allowed.includes(origin) || allowed.includes("*");
  return {
    "Access-Control-Allow-Origin": ok ? origin || "*" : allowed[0] || "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, env, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(env, request),
    },
  });
}

function normWallet(raw) {
  const w = String(raw || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(w)) return null;
  return w.toLowerCase();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }
    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/") {
      return json(
        { ok: true, service: "bushi-bukan-api", upstream: Boolean(env.BUKAN_UPSTREAM) },
        200,
        env,
        request
      );
    }
    if (request.method !== "GET" || url.pathname !== "/v1/bukan") {
      return json({ ok: false, error: "not_found" }, 404, env, request);
    }
    const wallet = normWallet(url.searchParams.get("wallet") || url.searchParams.get("address"));
    if (!wallet) return json({ ok: false, error: "bad_wallet" }, 400, env, request);

    const upstream = (env.BUKAN_UPSTREAM || "").replace(/\/$/, "");
    if (!upstream) {
      return json({ ok: false, error: "upstream_unset" }, 503, env, request);
    }
    const headers = { Accept: "application/json" };
    if (env.BUKAN_API_KEY) headers["X-Bukan-Key"] = env.BUKAN_API_KEY;
    try {
      const res = await fetch(`${upstream}/v1/bukan?wallet=${wallet}`, { headers });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return json({ ok: false, error: "upstream_bad" }, 502, env, request);
      }
      if (data && typeof data === "object") {
        if (data.discord) data.discord = { username: null, userId: null };
        delete data.displayName;
        delete data.username;
        delete data.userId;
        delete data.user_id;
      }
      return json(data, res.status, env, request);
    } catch (e) {
      return json(
        { ok: false, error: "upstream_down", detail: String(e).slice(0, 80) },
        502,
        env,
        request
      );
    }
  },
};
