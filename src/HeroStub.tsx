import { deniOf } from "./chain";
import { KamonMark, type Motif } from "./kamon";
import type { ChainSnap } from "./chain";
import { cutoutSrc, type CollectionHold } from "./collection";

const EXAM_MOTIF: Motif[] = ["ume", "ya", "kiku", "tomoe", "kiri", "rinpo"];

function watermarkOf(snap: ChainSnap): Motif | null {
  if (snap.rank > 0) return "kiku";
  for (let i = snap.exam.length - 1; i >= 0; i--) {
    if (snap.exam[i]) return EXAM_MOTIF[i];
  }
  return null;
}

export function HeroCopy({
  snap,
  hold,
  cutoutOk,
}: {
  snap: ChainSnap;
  hold: CollectionHold | null;
  cutoutOk: boolean;
}) {
  const deni = deniOf(snap.rank);
  if (hold) {
    return (
      <div className="hero-copy">
        <strong>{hold.name || "Bushi Collection"}</strong>
      </div>
    );
  }
  return (
    <div className="hero-copy">
      <strong>空の和紙</strong>
      <p>
        {deni
          ? `${deni.ja}の家紋を透かしています。蔵が開いたら、ここに顔が立ちます。`
          : "Bushi Collection のあと、所持から顔を選べます。今は空です。"}
      </p>
    </div>
  );
}

/** Right column — Collection cutout on 和紙, else 家紋 watermark. */
export function HeroStub({
  snap,
  hold,
  cutoutOk,
  onCutout,
}: {
  snap: ChainSnap;
  hold: CollectionHold | null;
  cutoutOk: boolean;
  onCutout: (ok: boolean) => void;
}) {
  const motif = watermarkOf(snap);
  return (
    <div className="hero" aria-hidden={!cutoutOk}>
      {hold ? (
        <div className="hero-face">
          <img
            src={cutoutSrc(hold.tokenId)}
            alt=""
            onLoad={() => onCutout(true)}
            onError={() => onCutout(false)}
            hidden={!cutoutOk}
          />
        </div>
      ) : null}
      {!cutoutOk && motif ? (
        <div className="hero-mark">
          <KamonMark motif={motif} />
        </div>
      ) : null}
      {!cutoutOk && !motif ? <div className="hero-void" /> : null}
    </div>
  );
}
