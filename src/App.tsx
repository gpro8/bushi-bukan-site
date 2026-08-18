import { useEffect, useMemo, useState } from "react";
import {
  DENI,
  deniOf,
  loadSnap,
  nextKeyFromChain,
  parseWalletParam,
  setWalletParam,
  shortAddr,
  type ChainSnap,
  type NextKey,
} from "./chain";
import { toggleTheme, type ThemeMode } from "./theme";

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(
    () =>
      (document.documentElement.getAttribute("data-theme") as ThemeMode) ||
      "light"
  );
  const [input, setInput] = useState(parseWalletParam);
  const [snap, setSnap] = useState<ChainSnap | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (raw: string) => {
    setErr(null);
    setBusy(true);
    try {
      const s = await loadSnap(raw);
      setSnap(s);
      setInput(s.wallet);
      setWalletParam(s.wallet);
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
          <p className="muted">義（Gi）と位階は Worker 接続後に表示します。今は保有層のみ。</p>
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
              位階 · 義 — Worker 後 · Rank は義を増やさない
            </div>
          </div>

          <div className="grid">
            <div className="col">
              <h2>貢献層</h2>
              <div className="big muted-big">—</div>
              <p className="muted">
                表示 Gi / 質 / 会話 / 画像 / ボーナスは Discord と同じ数字を Worker が返します。ブラウザは bot DB を開きません。
              </p>
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
