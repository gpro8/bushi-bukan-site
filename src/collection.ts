import { getAddress, isAddress, type Address } from "viem";
import { client } from "./chain";

/** Base 8453 A1 Bushi Collection */
export const COLLECTION = "0x7081697320B69c9cfBC5b733668b4D141CEa9149" as Address;

const COLLECTION_ABI = [
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

export type CollectionHold = {
  tokenId: number;
  name: string;
  backgroundColor: string;
  image: string;
};

function arweaveHttp(uri: string) {
  const u = uri.trim();
  if (u.startsWith("ar://")) return `https://arweave.net/${u.slice(5)}`;
  return u;
}

function parseBg(raw: unknown): string {
  const s = String(raw || "").replace(/^#/, "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toUpperCase()}`;
  return "#F5F0E6";
}

async function readMeta(tokenURI: string): Promise<{
  name: string;
  backgroundColor: string;
  image: string;
}> {
  const res = await fetch(arweaveHttp(tokenURI), { headers: { Accept: "application/json" } });
  const data = (await res.json()) as {
    name?: string;
    background_color?: string;
    image?: string;
  };
  return {
    name: data.name || "",
    backgroundColor: parseBg(data.background_color),
    image: data.image ? arweaveHttp(data.image) : "",
  };
}

/** Cutout on GH Pages — not the NFT JPEG. Missing file → empty 和紙. */
export function cutoutSrc(tokenId: number) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}cutouts/${tokenId}.png`;
}

/** First Collection token among メイン + aliases. Soft-fail → []. */
export async function loadCollection(wallets: string[]): Promise<CollectionHold[]> {
  const owners = new Set<string>();
  for (const raw of wallets) {
    if (!raw || !isAddress(raw)) continue;
    owners.add(getAddress(raw).toLowerCase());
  }
  if (!owners.size) return [];
  try {
    const minted = await client.readContract({
      address: COLLECTION,
      abi: COLLECTION_ABI,
      functionName: "totalMinted",
    });
    const n = Number(minted);
    if (!n) return [];
    const ids = Array.from({ length: n }, (_, i) => BigInt(i + 1));
    const ownerReads = await client.multicall({
      allowFailure: true,
      contracts: ids.map((tokenId) => ({
        address: COLLECTION,
        abi: COLLECTION_ABI,
        functionName: "ownerOf" as const,
        args: [tokenId] as const,
      })),
    });
    const held: number[] = [];
    ownerReads.forEach((row, i) => {
      if (row.status !== "success") return;
      const own = String(row.result).toLowerCase();
      if (owners.has(own)) held.push(i + 1);
    });
    if (!held.length) return [];
    const uriReads = await client.multicall({
      allowFailure: true,
      contracts: held.map((id) => ({
        address: COLLECTION,
        abi: COLLECTION_ABI,
        functionName: "tokenURI" as const,
        args: [BigInt(id)] as const,
      })),
    });
    const out: CollectionHold[] = [];
    for (let i = 0; i < held.length; i++) {
      const row = uriReads[i];
      if (row.status !== "success" || !row.result) continue;
      try {
        const meta = await readMeta(String(row.result));
        out.push({ tokenId: held[i], ...meta });
      } catch {
        out.push({
          tokenId: held[i],
          name: "",
          backgroundColor: "#F5F0E6",
          image: "",
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}
