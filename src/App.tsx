import { useEffect, useMemo, useState } from "react";
import {
  DENI,
  deniOf,
  loadGi,
  loadSnap,
  nextKeyFromChain,
  parseWalletParam,
  setWalletParam,
  shortAddr,
  type ChainSnap,
  type GiSnap,
  type NextKey,
} from "./chain";
import { toggleTheme, type ThemeMode } from "./theme";

function pct(part: number, total: number) {
  if (!total || part <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(
    () =>
      (document.documentElement.getAttribute("data-theme") as ThemeMode) ||
      "light"
  );
  const [input, setInput] = useState(parseWalletParam);
  const [snap, setSnap] = useState<ChainSnap | null>(null);
  const [gi, setGi] = useState<GiSnap | null>(null);
  const [giLinked, setGiLinked] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (raw: string) => {
    setErr(null);
    setBusy(true);
    setGi(null);
    setGiLinked(null);
    try {
      const s = await loadSnap(raw);
      setSnap(s);
      setInput(s.wallet);
      setWalletParam(s.wallet);
      const g = await loadGi(s.wallet);
      setGi(g.gi);
      setGiLinked(g.linked);
    } catch (e) {
      setSnap(null);
      setErr(e instanceof Error ? e.message : "読み取れませんでした");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const initial = parseWalletParam();
    if (initial) void lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deni = snap ? deniOf(snap.rank) : null;
  const key: NextKey | null = snap ? nextKeyFromChain(snap) : null;
  const passed = useMemo(
    () =>
      snap
        ? DENI.filter((_, i) => snap.exam[i])
            .map((d) => d.ja)
            .join("・") || "なし"
        : "—",
    [snap]
  );

  return (
    <>
      <header className="bar">
        <strong>武鑑</strong>
        <form
          className="lookup"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.trim())}
            placeholder="0x… を見る"
            spellCheck={false}
            aria-label="ウォレット"
          />
          <button type="submit" disabled={busy}>
            {busy ? "…" : "見る"}
          </button>
        </form>
        <button
          type="button"
          className="theme"
          title={theme === "dark" ? "陽" : "陰"}
          onClick={() => setTheme(toggleTheme(theme))}
        >
          {theme === "dark" ? "陽" : "陰"}
        </button>
      </header>

      {!snap && (
        <section className="meishi">
          <h1>武鑑</h1>
          <p>義と伝位の名鑑。ウォレットを入れると、検定と伝位を鎖から読みます。</p>
          <p className="muted">義はウォレット連携済みなら同じ数字を表示します（Discord 名は出しません）。</p>
          {err && <p className="err">{err}</p>}
        </section>
      )}

      {snap && (
        <>
          <div className="who">
            <div>
              {shortAddr(snap.wallet)}{" "}
              {deni ? (
                <span
                  className="pill"
                  style={{ background: deni.hex, color: deni.ink }}
                >
                  {deni.ja} {deni.code}
                </span>
              ) : (
                <span className="pill empty">伝位なし</span>
              )}
            </div>
            <div className="sub">
              {gi
                ? `位階 #${gi.rank} / ${gi.cohort} · 直近7日 +${gi.recent7d} · Rank は義を増やさない`
                : giLinked === false
                  ? "義未連携（ウォレットを Discord でリンク） · Rank は義を増やさない"
                  : "義を読み込み中 / 未接続 · Rank は義を増やさない"}
            </div>
          </div>

          <div className="grid">
            <div className="col">
              <h2>貢献層</h2>
              {gi ? (
                <>
                  <div className="big">
                    {gi.total} <span style={{ fontSize: "1rem" }}>義</span>
                  </div>
                  <p className="lane">質 {gi.quality}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.quality, gi.total)}%` }} />
                  </div>
                  <p className="lane">会話 {gi.participation}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.participation, gi.total)}%` }} />
                  </div>
                  <p className="lane">画像 {gi.media}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.media, gi.total)}%` }} />
                  </div>
                  <p className="lane">その他 {gi.other}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.other, gi.total)}%` }} />
                  </div>
                  <p className="lane">ボーナス {gi.bonus}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.bonus, gi.total)}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="big muted-big">—</div>
                  <p className="muted">
                    {giLinked === false
                      ? "このウォレットはまだ Discord と連携されていません。"
                      : "義は bot と同じ数字です。今は未接続です。"}
                  </p>
                </>
              )}
            </div>
            <div className="col hold">
              <h2>保有層</h2>
              <div className="slot">
                伝位 Rank SBT · {deni ? `${deni.ja}` : "未点灯"}
              </div>
              <div className="slot">検定 ExamPass · {passed}</div>
              <div className="slot">家格 · 倍率なし（Rank は義を増やさない）</div>
              <div className="slot muted">蔵 / ミント · 未定のため非表示</div>
            </div>
          </div>

          <div className="shelf">
            <h2>所持家紋</h2>
            <div className="mons">
              {DENI.map((d, i) => (
                <div key={d.code} className={snap.exam[i] ? "mon" : "mon off"}>
                  <i>梅</i>
                  検定・{d.ja}
                </div>
              ))}
              <div className={snap.rank > 0 ? "mon" : "mon off"}>
                <i>菊</i>
                伝位{deni ? `・${deni.ja}` : ""}
              </div>
              <div className="mon off">
                <i>七</i>加勢
              </div>
              <div className="mon off">
                <i>幟</i>旗手
              </div>
            </div>
          </div>

          {key &&
            (key.href ? (
              <a className="cta" href={key.href} target="_blank" rel="noreferrer">
                次の鍵：{key.labelJa}
              </a>
            ) : (
              <p className="cta static">次の鍵：{key.labelJa}</p>
            ))}
          {err && <p className="err wrap">{err}</p>}
        </>
      )}
    </>
  );
}
