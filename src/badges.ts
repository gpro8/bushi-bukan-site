/** Badge registry — add a row, don't fork App.tsx. */

import { DENI, type ChainSnap, type EventSnap, type SukeSnap } from "./chain";

export type Badge = {
  id: string;
  family: string;
  glyph: string;
  label: string;
  lit: boolean;
  adapter: "onchain" | "offchain";
};

export function collectBadges(
  snap: ChainSnap,
  suke: SukeSnap | null,
  events: EventSnap | null
): Badge[] {
  const out: Badge[] = [];
  for (const d of DENI) {
    const i = d.tier - 1;
    out.push({
      id: `exam-${d.code}`,
      family: "exam",
      glyph: "梅",
      label: `検定・${d.ja}`,
      lit: Boolean(snap.exam[i]),
      adapter: "onchain",
    });
  }
  const deni = DENI.find((d) => d.tier === snap.rank);
  out.push({
    id: "rank",
    family: "rank",
    glyph: "菊",
    label: deni ? `伝位・${deni.ja}` : "伝位",
    lit: snap.rank > 0,
    adapter: "onchain",
  });
  out.push({
    id: "flag",
    family: "sukedachi-flag",
    glyph: "幟",
    label: suke?.flag.tier === 5 ? "旗手・5" : "旗手",
    lit: Boolean(suke?.flag.lit),
    adapter: "offchain",
  });
  out.push({
    id: "kase",
    family: "sukedachi-kase",
    glyph: "七",
    label: suke?.kase.lit
      ? suke.kase.omoi
        ? `加勢・${suke.kase.omoi}`
        : "加勢した"
      : "加勢",
    lit: Boolean(suke?.kase.lit),
    adapter: "offchain",
  });
  out.push({
    id: "gien",
    family: "sukedachi-gien",
    glyph: "水",
    label: suke?.gien.lit
      ? suke.gien.omoi
        ? `義援・${suke.gien.omoi}`
        : "義援した"
      : "義援",
    lit: Boolean(suke?.gien.lit),
    adapter: "offchain",
  });
  const vols = events?.asobi?.vols || [];
  out.push({
    id: "asobi",
    family: "asobi",
    glyph: "遊",
    label:
      vols.length > 1
        ? `遊BO・${vols.length}`
        : vols.length === 1
          ? `遊BO・vol.${vols[0]}`
          : "遊BO",
    lit: Boolean(events?.asobi?.lit),
    adapter: "offchain",
  });
  return out;
}
