import { useEffect, useMemo, useState } from "react";
import {
  DENI,
  deniOf,
  loadGi,
  loadSnap,
  loadSuke,
  loadTestSnap,
  nextKeyFromChain,
  parseWalletParam,
  setWalletParam,
  shortAddr,
  giSpendable,
  type ChainSnap,
  type EventSnap,
  type GiSnap,
  type NextKey,
  type PublicDiscord,
  type SukeSnap,
  type TestSnap,
} from "./chain";
import { EmblemShelf } from "./EmblemShelf";
import { HeroCopy, HeroStub } from "./HeroStub";
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
  const [suke, setSuke] = useState<SukeSnap | null>(null);
  const [events, setEvents] = useState<EventSnap | null>(null);
  const [test, setTest] = useState<TestSnap | null>(null);
  const [pub, setPub] = useState<PublicDiscord | null>(null);
  const [giLinked, setGiLinked] = useState<boolean | null>(null);
  const [aliases, setAliases] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (raw: string) => {
    setErr(null);
    setBusy(true);
    setGi(null);
    setSuke(null);
    setEvents(null);
    setTest(null);
    setPub(null);
    setGiLinked(null);
    setAliases([]);
    setPrimary(null);
    try {
      const s = await loadSnap(raw);
      setSnap(s);
      setInput(s.wallet);
      setWalletParam(s.wallet);
      const g = await loadGi(s.wallet);
      setGi(g.gi);
      setGiLinked(g.linked);
      setEvents(g.events);
      setPub(g.discord);
      setPrimary(g.primary);
      setAliases(g.aliases);
      const testWallets = [s.wallet, g.primary, ...(g.aliases || [])].filter(
        Boolean
      ) as string[];
      setTest(await loadTestSnap(testWallets));
      const sk = await loadSuke(s.wallet);
      setSuke(sk);
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
        <a className="brand" href="./" aria-label="武鑑">
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}bukan-logo-figure.png`}
            width={32}
            height={32}
            alt=""
          />
          <strong>武鑑</strong>
        </a>
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
          <div className="meishi-brand">
            <img
              className="meishi-mark"
              src={`${import.meta.env.BASE_URL}bukan-logo-figure.png`}
              width={120}
              height={120}
              alt=""
            />
            <h1>武鑑</h1>
          </div>
          <p>義と伝位の名鑑。ウォレットを入れると、検定と伝位を鎖から読みます。</p>
          <p className="muted">義はウォレット連携済みなら同じ数字を表示します。Discord 名は本人が `/bukan_public` したときだけ。</p>
          {err && <p className="err">{err}</p>}
        </section>
      )}

      {snap && (
        <>
          <div className="stage">
            <div className="who">
              <div>
                {pub?.displayName ? (
                  <strong className="who-name">{pub.displayName}</strong>
                ) : null}{" "}
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
              {aliases.length > 0 ? (
                <div className="aliases">
                  {primary ? <span>主 {shortAddr(primary)}</span> : null}
                  {aliases.map((a) => (
                    <span key={a}>別名 {shortAddr(a)}</span>
                  ))}
                </div>
              ) : null}
              {pub?.roles && pub.roles.length > 0 ? (
                <div className="roles">
                  {pub.roles.slice(0, 8).map((r) => (
                    <span key={r} className="role-chip">
                      {r}
                    </span>
                  ))}
                  {pub.roles.length > 8 ? (
                    <span className="role-chip more">+{pub.roles.length - 8}</span>
                  ) : null}
                </div>
              ) : null}
              <HeroCopy snap={snap} />
            </div>
            <HeroStub snap={snap} />
          </div>

          <div className="grid">
            <div className="col">
              <h2>貢献層</h2>
              {gi ? (
                <>
                  <div className="big">
                    {gi.pot ?? gi.total} <span style={{ fontSize: "1rem" }}>義</span>
                  </div>
                  <p className="lane">いまの総義</p>
                  <p className="lane">
                    生涯 {gi.lifetime ?? gi.total} · お裾分けした {gi.given ?? 0} ·
                    受け取った義 {gi.received ?? 0}
                  </p>
                  <p className="lane">
                    使える義 {giSpendable(gi, deni?.tier ?? null)}
                    {deni ? ` · ロック ${deni.ja}` : ""}
                  </p>
                  <p className="lane">質 {gi.quality}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.quality, gi.lifetime ?? gi.total)}%` }} />
                  </div>
                  <p className="lane">会話 {gi.participation}</p>
                  <div className="line">
                    <i
                      style={{
                        width: `${pct(gi.participation, gi.lifetime ?? gi.total)}%`,
                      }}
                    />
                  </div>
                  <p className="lane">画像 {gi.media}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.media, gi.lifetime ?? gi.total)}%` }} />
                  </div>
                  <p className="lane">その他 {gi.other}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.other, gi.lifetime ?? gi.total)}%` }} />
                  </div>
                  <p className="lane">ボーナス {gi.bonus}</p>
                  <div className="line">
                    <i style={{ width: `${pct(gi.bonus, gi.lifetime ?? gi.total)}%` }} />
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

          <EmblemShelf snap={snap} suke={suke} events={events} test={test} />

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
