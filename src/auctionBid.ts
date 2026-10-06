import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  parseAbiItem,
  type Address,
} from "viem";
import { base } from "viem/chains";

/** Base 8453 A1 auction. Logs only — no hasBid view. */
export const AUCTION = "0x7e8bFB5126A74127Cd0011726741a17E56093fAC" as Address;

/**
 * Opening BidPlaced is block 52033336 (0.01 ETH). Do not scan from deploy
 * (2.1M blocks). mainnet.base.org allows 500 blocks per getLogs.
 * Seed is the full lot-1 set: opening bid through 52165000, 0 failed chunks.
 */
const FLOOR = 52025000n;
const SEED_TO = 52165000n;
const CHUNK = 499n;
const SEED = [
  "0x3c2d71b48832e682f539733cc286f08c34e4ef54",
  "0x0d546afb4bda5e60c4d31bde126cb3700ea8977a",
  "0xd06584400f55099ee2c872b53a48f1ff85067c4a",
  "0xdc153ee06e5112633a5d4ef4f61ff045ee18a512",
];

const bidEvent = parseAbiItem(
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 endTime)"
);

/** Logs RPC. Not the fallback client — publicnode archive getLogs wants a token. */
const logsClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org", { timeout: 12_000 }),
});

const CACHE_KEY = "bushi.bukan.bidders.v2";

type Cache = { to: string; addrs: string[] };

function readCache(): { to: bigint; addrs: Set<string> } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Cache;
    if (!data || !Array.isArray(data.addrs)) return null;
    return { to: BigInt(data.to), addrs: new Set(data.addrs.map((a) => a.toLowerCase())) };
  } catch {
    return null;
  }
}

function writeCache(to: bigint, addrs: Set<string>) {
  try {
    const data: Cache = { to: to.toString(), addrs: [...addrs] };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

function seed(): { to: bigint; addrs: Set<string> } {
  const cached = readCache();
  const addrs = new Set(SEED);
  if (cached) for (const a of cached.addrs) addrs.add(a);
  const to = cached && cached.to > SEED_TO ? cached.to : SEED_TO;
  return { to, addrs };
}

let known = seed();
let inflight: Promise<Set<string>> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pull(from: bigint, to: bigint) {
  for (let i = 0; i < 5; i++) {
    try {
      return await logsClient.getLogs({
        address: AUCTION,
        event: bidEvent,
        fromBlock: from,
        toBlock: to,
      });
    } catch {
      await sleep(400 * (i + 1));
    }
  }
  return null;
}

async function scan(): Promise<Set<string>> {
  const head = await logsClient.getBlockNumber();
  let from = known.to + 1n;
  if (from < FLOOR) from = FLOOR;
  if (from > head) return known.addrs;

  let cursor = from;
  while (cursor <= head) {
    const to = cursor + CHUNK > head ? head : cursor + CHUNK;
    const logs = await pull(cursor, to);
    if (!logs) break;
    for (const log of logs) {
      const bidder = log.args.bidder;
      if (bidder) known.addrs.add(bidder.toLowerCase());
    }
    known = { to, addrs: known.addrs };
    writeCache(to, known.addrs);
    cursor = to + 1n;
  }
  return known.addrs;
}

/** Bidder set. Seed is instant; newer blocks fill in. */
export function bidderSet(): Set<string> {
  return known.addrs;
}

export function refreshBidders(): Promise<Set<string>> {
  if (!inflight) {
    inflight = scan()
      .catch(() => known.addrs)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function walletHasBid(wallets: string[], set: Set<string>): boolean {
  for (const raw of wallets) {
    if (!raw || !isAddress(raw)) continue;
    if (set.has(getAddress(raw).toLowerCase())) return true;
  }
  return false;
}
