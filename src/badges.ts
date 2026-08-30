/** Badge registry — add a row, don't fork App.tsx. */

import { DENI, type ChainSnap, type EventSnap, type SukeSnap, type TestSnap } from "./chain";
import type { Motif } from "./kamon";

export type Badge = {
  id: string;
  family: string;
  motif: Motif;
  label: string;
  hint: string;
  lit: boolean;
  tint?: string;
  adapter: "onchain" | "offchain";
};

const EXAM_MOTIF: Motif[] = ["ume", "ya", "kiku", "tomoe", "kiri", "rinpo"];

export function collectBadges(
  snap: ChainSnap,
  suke: SukeSnap | null,
  events: EventSnap | null,
  test: TestSnap | null = null
): Badge[] {
  const out: Badge[] = [];
  for (const d of DENI) {
    const i = d.tier - 1;
    out.push({
      id: `exam-${d.code}`,
      family: "exam",
      motif: EXAM_MOTIF[i],
      label: `検定・${d.ja}`,
      hint: "WEB3検定に合格すると点灯",
      lit: Boolean(snap.exam[i]),
      adapter: "onchain",
    });
  }
  const deni = DENI.find((d) => d.tier === snap.rank);
  out.push({
    id: "rank",
    family: "rank",
    motif: "kiku",
    label: deni ? `伝位・${deni.ja}` : "伝位",
    hint: "Rank SBT を持つと点灯（義は増えない）",
    lit: snap.rank > 0,
    adapter: "onchain",
  });
  out.push({
    id: "flag",
    family: "sukedachi-flag",
    motif: "nobori",
    label: suke?.flag.tier === 5 ? "旗手・5" : "旗手",
    hint: "助太刀で旗を掲げると点灯",
    lit: Boolean(suke?.flag.lit),
    tint: "#cd5e3c",
    adapter: "offchain",
  });
  out.push({
    id: "kase",
    family: "sukedachi-kase",
    motif: "shippo",
    label: suke?.kase.lit
      ? suke.kase.omoi
        ? `加勢・${suke.kase.omoi}`
        : "加勢した"
      : "加勢",
    hint: "皆済の旗に加勢すると点灯",
    lit: Boolean(suke?.kase.lit),
    tint: "#cd5e3c",
    adapter: "offchain",
  });
  out.push({
    id: "gien",
    family: "sukedachi-gien",
    motif: "nami",
    label: suke?.gien.lit
      ? suke.gien.omoi
        ? `義援・${suke.gien.omoi}`
        : "義援した"
      : "義援",
    hint: "義援の旗に想いを足すと点灯",
    lit: Boolean(suke?.gien.lit),
    tint: "#cd5e3c",
    adapter: "offchain",
  });
  const vols = events?.asobi?.vols || [];
  out.push({
    id: "asobi",
    family: "asobi",
    motif: "cho",
    label:
      vols.length > 1
        ? `遊BO・${vols.length}`
        : vols.length === 1
          ? `遊BO・vol.${vols[0]}`
          : "遊BO",
    hint: "BOと遊BO に参加すると点灯",
    lit: Boolean(events?.asobi?.lit),
    tint: "#cd5e3c",
    adapter: "offchain",
  });
  out.push({
    id: "exam-sepolia",
    family: "testnet",
    motif: "ume",
    label: "試験・検定",
    hint: "Base Sepolia のいずれかの ExamPass を持つと点灯（本番の伝位にはならない）",
    lit: Boolean(test?.exam),
    adapter: "onchain",
  });
  out.push({
    id: "rank-sepolia",
    family: "testnet",
    motif: "tomoe",
    label: "試験・伝位",
    hint: "Base Sepolia のいずれかの Rank SBT を持つと点灯（本番の伝位にはならない）",
    lit: Boolean(test?.rank),
    adapter: "onchain",
  });
  out.push({
    id: "auction",
    family: "auction",
    motif: "kiri",
    label: "出陣",
    hint: "Bushi Collection 競売に参加すると点灯（第一ロット後）",
    lit: false,
    adapter: "offchain",
  });
  return out;
}
