import { deniOf } from "./chain";
import { KamonMark, type Motif } from "./kamon";
import type { ChainSnap } from "./chain";

const EXAM_MOTIF: Motif[] = ["ume", "ya", "kiku", "tomoe", "kiri", "rinpo"];

function watermarkOf(snap: ChainSnap): Motif | null {
  if (snap.rank > 0) return "kiku";
  for (let i = snap.exam.length - 1; i >= 0; i--) {
    if (snap.exam[i]) return EXAM_MOTIF[i];
  }
  return null;
}

export function HeroCopy({ snap }: { snap: ChainSnap }) {
  const deni = deniOf(snap.rank);
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

/** Right column only — no text. Future Collection face lives here. */
export function HeroStub({ snap }: { snap: ChainSnap }) {
  const motif = watermarkOf(snap);
  return (
    <div className="hero">
      <div className="hero-art" aria-hidden="true">
        {motif ? (
          <div className="hero-mark">
            <KamonMark motif={motif} />
          </div>
        ) : (
          <div className="hero-void" />
        )}
      </div>
      <HeroCopy snap={snap} />
    </div>
  );
}
