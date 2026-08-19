/**
 * Public 武鑑 API.
 * GET /health
 * GET /v1/bukan?wallet=0x…  → Gi (Mac) + 旗手/加勢/義援 (Sukedachi public Worker)
 *
 * Never returns Discord username / user_id.
 * Never returns raw JPYC amounts (想い bands only).
 */
const SUKE = "https://sukedachi-polygon-rpc.bushidao.workers.dev";

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

function countTier(n) {
  if (n <= 0) return 0;
  if (n >= 5) return 5;
  return 1;
}

function omoiBand(yen) {
  if (yen <= 0) return null;
  if (yen >= 10000) return "義";
  if (yen >= 1000) return "志";
  return "心";
}

function yen18(total) {
  try {
    return Number(BigInt(total || "0") / 1000000000000000000n);
  } catch {
    return 0;
  }
}

async function loadSukedachi(wallet) {
  const campsRes = await fetch(`${SUKE}/v1/campaigns`);
  const camps = await campsRes.json();
  const list = Array.isArray(camps.campaigns) ? camps.campaigns : [];
  let started = 0;
  let kaseTimes = 0;
  let kaseYen = 0;
  let gienTimes = 0;
  let gienYen = 0;

  for (const c of list) {
    const addr = String(c.address || "").toLowerCase();
    const creator = String(c.creator || "").toLowerCase();
    const kind = c.kind === "charity" ? "charity" : "crowdfund";
    if (creator === wallet) started += 1;
    if (!addr) continue;
    try {
      const cr = await fetch(
        `${SUKE}/contributors?address=${addr}&kind=${kind}`,
        {
          headers: {
            Accept: "application/json",
            Origin: "https://gpro8.github.io",
          },
        }
      );
      const cj = await cr.json();
      const row = (cj.rows || []).find(
        (r) => String(r.address || "").toLowerCase() === wallet
      );
      if (!row) continue;
      const y = yen18(row.total);
      if (kind === "charity") {
        gienTimes += 1;
        gienYen += y;
      } else {
        kaseTimes += 1;
        kaseYen += y;
      }
    } catch {
      /* skip one 旗 */
    }
  }

  return {
    flag: { started, tier: countTier(started), lit: started > 0 },
    kase: {
      joined: kaseTimes,
      tier: countTier(kaseTimes),
      omoi: omoiBand(kaseYen),
      lit: kaseTimes > 0,
    },
    gien: {
      joined: gienTimes,
      tier: countTier(gienTimes),
      omoi: omoiBand(gienYen),
      lit: gienTimes > 0,
    },
  };
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

    let data;
    let status = 200;
    try {
      const res = await fetch(`${upstream}/v1/bukan?wallet=${wallet}`, { headers });
      status = res.status;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        return json({ ok: false, error: "upstream_bad" }, 502, env, request);
      }
    } catch (e) {
      return json(
        { ok: false, error: "upstream_down", detail: String(e).slice(0, 80) },
        502,
        env,
        request
      );
    }

    if (data && typeof data === "object") {
      if (data.discord) data.discord = { username: null, userId: null };
      delete data.displayName;
      delete data.username;
      delete data.userId;
      delete data.user_id;
      try {
        data.sukedachi = await loadSukedachi(wallet);
      } catch {
        data.sukedachi = null;
      }
    }
    return json(data, status, env, request);
  },
};
