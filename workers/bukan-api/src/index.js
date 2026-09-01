/**
 * Public 武鑑 Gi proxy.
 * GET /health
 * GET /v1/bukan?wallet=0x…  → live Mac API, else KV replica
 *
 * Replica is written from the Mac via `wrangler kv key put` (no public write).
 *
 * 旗手/加勢/義援 are read in the browser from the public Sukedachi Worker
 * (Workers cannot fetch other *.workers.dev — CF 1042).
 *
 * Never returns Discord user_id.
 */

const SNAP_KEY = "snapshot";

function corsHeaders(env, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ok = !origin || allowed.includes(origin) || allowed.includes("*");
  return {
    "Access-Control-Allow-Origin": ok ? origin || "*" : allowed[0] || "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Link-Key",
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

function stripIdentity(data) {
  if (!data || typeof data !== "object") return data;
  const d = data.discord && typeof data.discord === "object" ? data.discord : {};
  data.discord = {
    displayName: d.displayName || null,
    username: d.username || null,
    roles: Array.isArray(d.roles) ? d.roles.slice(0, 24) : null,
    userId: null,
  };
  delete data.displayName;
  delete data.username;
  delete data.userId;
  delete data.user_id;
  return data;
}

async function fromKv(env, wallet) {
  if (!env.BUKAN_GI) return null;
  const raw = await env.BUKAN_GI.get(SNAP_KEY);
  if (!raw) return null;
  let snap;
  try {
    snap = JSON.parse(raw);
  } catch {
    return null;
  }
  const items = Array.isArray(snap.items) ? snap.items : [];
  const hit = items.find((it) => it && String(it.wallet || "").toLowerCase() === wallet);
  if (!hit) {
    return {
      ok: true,
      version: 1,
      wallet,
      linked: false,
      gi: null,
      events: null,
      discord: { displayName: null, username: null, roles: null, userId: null },
      source: "kv",
      asOf: snap.asOf || null,
    };
  }
  const data = stripIdentity({ ...hit });
  data.source = "kv";
  data.asOf = snap.asOf || null;
  return data;
}

function originAllowed(env, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origin) return false;
  return allowed.includes(origin) || allowed.includes("*");
}

function parseLinkMessage(message) {
  const m = String(message || "");
  if (!m.startsWith("BushiDAO Wallet Link\n")) return null;
  const id = /(?:^|\n)Discord: (\d{5,30})(?:\n|$)/.exec(m);
  if (!id) return null;
  if (m.length > 400) return null;
  return id[1];
}

async function handleWalletLinkPost(request, env) {
  if (!originAllowed(env, request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403, env, request);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400, env, request);
  }
  const message = String(body.message || "");
  const address = String(body.address || "").trim();
  const signature = String(body.signature || "").trim();
  const userId = parseLinkMessage(message);
  if (!userId) return json({ ok: false, error: "bad_message" }, 400, env, request);
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return json({ ok: false, error: "bad_wallet" }, 400, env, request);
  }
  if (!/^0x[a-fA-F0-9]{128,200}$/.test(signature)) {
    return json({ ok: false, error: "bad_sig" }, 400, env, request);
  }
  if (!env.BUKAN_GI) return json({ ok: false, error: "no_kv" }, 503, env, request);
  await env.BUKAN_GI.put(
    `wlink:${userId}`,
    JSON.stringify({ address, signature, message, at: Date.now() }),
    { expirationTtl: 1800 }
  );
  return json({ ok: true }, 200, env, request);
}

async function handleWalletLinkGet(request, env, url) {
  const key = env.WALLET_LINK_READ_KEY || "";
  const got = request.headers.get("X-Link-Key") || "";
  if (!key || got !== key) {
    return json({ ok: false, error: "unauthorized" }, 401, env, request);
  }
  const user = String(url.searchParams.get("user") || "").trim();
  if (!/^\d{5,30}$/.test(user)) {
    return json({ ok: false, error: "bad_user" }, 400, env, request);
  }
  const raw = await env.BUKAN_GI.get(`wlink:${user}`);
  if (!raw) return json({ ok: false, error: "not_found" }, 404, env, request);
  let rec;
  try {
    rec = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_store" }, 500, env, request);
  }
  return json(
    {
      ok: true,
      address: rec.address,
      signature: rec.signature,
      message: rec.message,
    },
    200,
    env,
    request
  );
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }
    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/") {
      return json(
        {
          ok: true,
          service: "bushi-bukan-api",
          upstream: Boolean(env.BUKAN_UPSTREAM),
          kv: Boolean(env.BUKAN_GI),
          vpc: Boolean(env.BUKAN_VPC),
        },
        200,
        env,
        request
      );
    }

    if (url.pathname === "/v1/wallet-link") {
      if (request.method === "POST") return handleWalletLinkPost(request, env);
      if (request.method === "GET") return handleWalletLinkGet(request, env, url);
      return json({ ok: false, error: "method" }, 405, env, request);
    }

    if (request.method !== "GET" || url.pathname !== "/v1/bukan") {
      return json({ ok: false, error: "not_found" }, 404, env, request);
    }
    const wallet = normWallet(url.searchParams.get("wallet") || url.searchParams.get("address"));
    if (!wallet) return json({ ok: false, error: "bad_wallet" }, 400, env, request);

    const headers = { Accept: "application/json" };
    if (env.BUKAN_API_KEY) headers["X-Bukan-Key"] = env.BUKAN_API_KEY;
    const path = `/v1/bukan?wallet=${wallet}`;

    async function tryFetch(label, promise) {
      try {
        const res = await promise;
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          return null;
        }
        if (data && typeof data === "object" && data.ok !== false) {
          stripIdentity(data);
          data.source = label;
          return json(data, res.status, env, request);
        }
      } catch {
        return null;
      }
      return null;
    }

    if (env.BUKAN_VPC) {
      const hit = await tryFetch(
        "vpc",
        env.BUKAN_VPC.fetch(`http://127.0.0.1:8788${path}`, { headers })
      );
      if (hit) return hit;
    }

    const upstream = (env.BUKAN_UPSTREAM || "").replace(/\/$/, "");
    if (upstream) {
      const hit = await tryFetch("live", fetch(`${upstream}${path}`, { headers }));
      if (hit) return hit;
    }

    const replica = await fromKv(env, wallet);
    if (replica) return json(replica, 200, env, request);
    return json({ ok: false, error: "upstream_down", source: "none" }, 502, env, request);
  },
};
