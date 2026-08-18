import {
  createPublicClient,
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

const RPC =
  (import.meta.env.VITE_RPC_URL as string | undefined) || "https://mainnet.base.org";

export const client = createPublicClient({
  chain: base,
  transport: http(RPC),
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
  thresholds: bigint[];
};

export async function loadSnap(raw: string): Promise<ChainSnap> {
  if (!isAddress(raw)) throw new Error("ウォレットアドレスを入力してください");
  const wallet = getAddress(raw);
  const examCalls = DENI.map((d) =>
    client.readContract({
      address: EXAM,
      abi: EXAM_ABI,
      functionName: "hasExamPass",
      args: [wallet, d.tier],
    })
  );
  const thCalls = DENI.map((d) =>
    client.readContract({
      address: RANK,
      abi: RANK_ABI,
      functionName: "giThresholds",
      args: [d.tier],
    })
  );
  const [rank, exam, thresholds] = await Promise.all([
    client.readContract({
      address: RANK,
      abi: RANK_ABI,
      functionName: "currentRank",
      args: [wallet],
    }),
    Promise.all(examCalls),
    Promise.all(thCalls),
  ]);
  return {
    wallet,
    rank: Number(rank),
    exam: exam.map(Boolean),
    thresholds,
  };
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
