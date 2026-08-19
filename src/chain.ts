import {
  createPublicClient,
  fallback,
  http,
  isAddress,
  getAddress,
  type Address,
} from "viem";
import { base } from "viem/chains";

export const EXAM = "0x58cf52F88a537F2343c8Da74760a03022E5Bd887" as Address;
export const RANK = "0xCb454D0Da9536cC8CA01CF2B1B3D441fb25b4eaa" as Address;

export const EXAM_URL = "https://giuliav6-ai.github.io/web3-kentei/";
export const SUKEDACHI_URL = "https://gpro8.github.io/sukedachi-site/";

const RPCS = [
  import.meta.env.VITE_RPC_URL as string | undefined,
  "https://base.publicnode.com",
  "https://mainnet.base.org",
].filter((u): u is string => Boolean(u));

export const client = createPublicClient({
  chain: base,
  transport: fallback(RPCS.map((url) => http(url, { timeout: 12_000 }))),
});

export const DENI = [
  { tier: 1, code: "NIUMON", ja: "入門", hex: "#dce8e9", ink: "#1b1916" },
  { tier: 2, code: "SHODEN", ja: "初伝", hex: "#3498db", ink: "#fff" },
  { tier: 3, code: "CHUDEN", ja: "中伝", hex: "#f1c40f", ink: "#1b1916" },
  { tier: 4, code: "OUDEN", ja: "奥伝", hex: "#1abc9c", ink: "#1b1916" },
  { tier: 5, code: "KAIDEN", ja: "皆伝", hex: "#11806a", ink: "#fff" },
  { tier: 6, code: "GOKUDEN", ja: "極伝", hex: "#71368a", ink: "#fff" },
] as const;

export type Deni = (typeof DENI)[number];

export function deniOf(tier: number): Deni | null {
  return DENI.find((d) => d.tier === tier) ?? null;
}

const EXAM_ABI = [
  {
    type: "function",
    name: "hasExamPass",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "level", type: "uint8" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const RANK_ABI = [
  {
    type: "function",
    name: "currentRank",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "giThresholds",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type ChainSnap = {
  wallet: Address;
  rank: number;
  exam: boolean[];
};

export function friendlyRpcError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const low = raw.toLowerCase();
  if (
    low.includes("rate limit") ||
    low.includes("429") ||
    low.includes("over rate")
  ) {
    return "混み合っています。少し待ってから、もう一度「見る」を押してください。";
  }
  if (low.includes("failed to fetch") || low.includes("network")) {
    return "接続できませんでした。通信を確認して再試行してください。";
  }
  return "読み取れませんでした。アドレスを確認して再試行してください。";
}

export async function loadSnap(raw: string): Promise<ChainSnap> {
  if (!isAddress(raw)) throw new Error("ウォレットアドレスを入力してください");
  const wallet = getAddress(raw);
  try {
    const rank = await client.readContract({
      address: RANK,
      abi: RANK_ABI,
      functionName: "currentRank",
      args: [wallet],
    });
    const exam = await client.multicall({
      allowFailure: false,
      contracts: DENI.map((d) => ({
        address: EXAM,
        abi: EXAM_ABI,
        functionName: "hasExamPass" as const,
        args: [wallet, d.tier] as const,
      })),
    });
    return {
      wallet,
      rank: Number(rank),
      exam: exam.map(Boolean),
    };
  } catch (e) {
    throw new Error(friendlyRpcError(e));
  }
}

export const BUKAN_API =
  (import.meta.env.VITE_BUKAN_API as string | undefined) ||
  "https://bushi-bukan-api.bushidao.workers.dev";

export type GiSnap = {
  total: number;
  quality: number;
  participation: number;
  media: number;
  other: number;
  bonus: number;
  recent7d: number;
  rank: number;
  cohort: number;
};

export type SukeFamily = {
  started?: number;
  joined?: number;
  tier: number;
  omoi?: string | null;
  lit: boolean;
};

export type SukeSnap = {
  flag: SukeFamily;
  kase: SukeFamily;
  gien: SukeFamily;
};

const SUKE_API = "https://sukedachi-polygon-rpc.bushidao.workers.dev";

function countTier(n: number) {
  if (n <= 0) return 0;
  if (n >= 5) return 5;
  return 1;
}

function omoiBand(yen: number): string | null {
  if (yen <= 0) return null;
  if (yen >= 10000) return "義";
  if (yen >= 1000) return "志";
  return "心";
}

function yen18(total: string) {
  try {
    return Number(BigInt(total || "0") / 1000000000000000000n);
  } catch {
    return 0;
  }
}

export async function loadSuke(wallet: string): Promise<SukeSnap | null> {
  try {
    const w = wallet.toLowerCase();
    const campsRes = await fetch(`${SUKE_API}/v1/campaigns`);
    const camps = (await campsRes.json()) as {
      campaigns?: { address?: string; creator?: string; kind?: string }[];
    };
    const list = camps.campaigns || [];
    let started = 0;
    let kaseTimes = 0;
    let kaseYen = 0;
    let gienTimes = 0;
    let gienYen = 0;
    for (const c of list) {
      const addr = (c.address || "").toLowerCase();
      const creator = (c.creator || "").toLowerCase();
      const kind = c.kind === "charity" ? "charity" : "crowdfund";
      if (creator === w) started += 1;
      if (!addr) continue;
      try {
        const cr = await fetch(
          `${SUKE_API}/contributors?address=${addr}&kind=${kind}`
        );
        const cj = (await cr.json()) as {
          rows?: { address?: string; total?: string }[];
        };
        const row = (cj.rows || []).find(
          (r) => (r.address || "").toLowerCase() === w
        );
        if (!row) continue;
        const y = yen18(row.total || "0");
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
  } catch {
    return null;
  }
}

export type EventSnap = {
  asobi?: { lit: boolean; vols: number[]; tier: number };
  auction_test?: { lit: boolean; tier: number };
  sukedachi_test?: { lit: boolean; tier: number };
};

export type PublicDiscord = {
  displayName: string | null;
  username: string | null;
  roles: string[] | null;
};

export async function loadGi(wallet: string): Promise<{
  linked: boolean;
  gi: GiSnap | null;
  events: EventSnap | null;
  discord: PublicDiscord | null;
}> {
  try {
    const res = await fetch(
      `${BUKAN_API.replace(/\/$/, "")}/v1/bukan?wallet=${encodeURIComponent(wallet)}`,
      { headers: { Accept: "application/json" } }
    );
    const data = (await res.json()) as {
      ok?: boolean;
      linked?: boolean;
      gi?: GiSnap | null;
      events?: EventSnap | null;
      discord?: PublicDiscord & { userId?: string | null };
    };
    if (!data?.ok) return { linked: false, gi: null, events: null, discord: null };
    const d = data.discord;
    return {
      linked: Boolean(data.linked),
      gi: data.gi ?? null,
      events: data.events ?? null,
      discord: d
        ? {
            displayName: d.displayName || null,
            username: d.username || null,
            roles: Array.isArray(d.roles) ? d.roles : null,
          }
        : null,
    };
  } catch {
    return { linked: false, gi: null, events: null, discord: null };
  }
}

export type NextKey = { id: string; labelJa: string; href?: string };

/** On-chain only until Worker fills Gi. */
export function nextKeyFromChain(s: ChainSnap): NextKey {
  const exam1 = s.exam[0];
  if (!exam1 && s.rank === 0) {
    return { id: "exam-1", labelJa: "入門の検定を受ける", href: EXAM_URL };
  }
  if (exam1 && s.rank === 0) {
    return { id: "mint-niumon", labelJa: "入門の伝位を受ける（Discord /mint_niumon）" };
  }
  for (let i = 0; i < 6; i++) {
    const tier = i + 1;
    if (s.rank >= tier) continue;
    if (!s.exam[i]) {
      return {
        id: `exam-${tier}`,
        labelJa: `${DENI[i].ja}の検定を受ける`,
        href: EXAM_URL,
      };
    }
    return {
      id: `mint-${tier}`,
      labelJa: `${DENI[i].ja}の伝位を受ける（Discord /mint_rank）`,
    };
  }
  return { id: "sukedachi", labelJa: "活動を続ける · 助太刀", href: SUKEDACHI_URL };
}

export function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function parseWalletParam(): string {
  const q = new URLSearchParams(window.location.search);
  return (q.get("w") || q.get("wallet") || "").trim();
}

export function setWalletParam(addr: string) {
  const u = new URL(window.location.href);
  if (addr) u.searchParams.set("w", addr);
  else u.searchParams.delete("w");
  history.replaceState(null, "", u.toString());
}
