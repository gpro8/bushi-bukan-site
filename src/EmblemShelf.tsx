import { useMemo, useState } from "react";
import { collectBadges, type Badge } from "./badges";
import { KamonMark } from "./kamon";
import type { ChainSnap, EventSnap, SukeSnap } from "./chain";

const VISIBLE = 8;

export function EmblemShelf({
  snap,
  suke,
  events,
}: {
  snap: ChainSnap;
  suke: SukeSnap | null;
  events: EventSnap | null;
}) {
  const badges = useMemo(
    () => collectBadges(snap, suke, events),
    [snap, suke, events]
  );
  const ordered = useMemo(() => {
    const lit = badges.filter((b) => b.lit);
    const dark = badges.filter((b) => !b.lit);
    return [...lit, ...dark];
  }, [badges]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const shown = open ? ordered : ordered.slice(0, VISIBLE);
  const extra = Math.max(0, ordered.length - VISIBLE);
  const picked = ordered.find((b) => b.id === sel) ?? null;
  const litN = badges.filter((b) => b.lit).length;

  const pick = (b: Badge) => setSel((id) => (id === b.id ? null : b.id));

  return (
    <div className="shelf">
      <h2>所持家紋</h2>
      <p className="shelf-meta">
        {litN} / {badges.length} 点灯 · 家紋を押すと道が見えます
      </p>
      <div className="mons" role="list">
        {shown.map((b) => (
          <button
            key={b.id}
            type="button"
            role="listitem"
            className={`mon${b.lit ? "" : " off"}${sel === b.id ? " on" : ""}`}
            style={b.lit && b.tint ? { color: b.tint } : undefined}
            aria-pressed={sel === b.id}
            aria-label={`${b.label} · ${b.lit ? "点灯" : "未点灯"}`}
            onClick={() => pick(b)}
          >
            <KamonMark motif={b.motif} />
          </button>
        ))}
        {!open && extra > 0 ? (
          <button
            type="button"
            className="mon more"
            onClick={() => setOpen(true)}
            aria-label={`ほか ${extra} の家紋`}
          >
            <span className="more-n">+{extra}</span>
          </button>
        ) : null}
      </div>
      {open && extra > 0 ? (
        <button type="button" className="shelf-fold" onClick={() => setOpen(false)}>
          しまって +{extra}
        </button>
      ) : null}
      {picked ? (
        <div className="mon-card">
          <strong>{picked.label}</strong>
          <span className="mon-state">{picked.lit ? "点灯" : "未点灯 · 招待"}</span>
          <p>{picked.hint}</p>
        </div>
      ) : (
        <p className="muted shelf-invite">未点灯は欠落ではなく、まだ歩ける道です。</p>
      )}
    </div>
  );
}
