import type { ReactNode } from "react";

export type Motif =
  | "ume"
  | "ya"
  | "kiku"
  | "tomoe"
  | "kiri"
  | "rinpo"
  | "nobori"
  | "shippo"
  | "nami"
  | "cho"
  | "shichiyo"
  | "ogi"
  | "matsu"
  | "tsuki"
  | "tsuru";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="mon-svg">
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {children}
    </svg>
  );
}

function Ume() {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { cx: 32 + Math.cos(a) * 11.2, cy: 32 + Math.sin(a) * 11.2 };
  });
  return (
    <Svg>
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="7.2" fill="currentColor" />
      ))}
      <circle cx="32" cy="32" r="5.2" fill="var(--panel)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="2" fill="currentColor" />
    </Svg>
  );
}

function Ya() {
  return (
    <Svg>
      <polygon points="32,10 36,22 32,20 28,22" fill="currentColor" />
      <rect x="30.6" y="20" width="2.8" height="28" fill="currentColor" />
      <path d="M24 44 L32 38 L40 44 L32 48 Z" fill="currentColor" />
      <path d="M26 50 L32 46 L38 50 L32 54 Z" fill="currentColor" />
    </Svg>
  );
}

function Kiku() {
  const petals = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5 * Math.PI) / 180;
    const x = 32 + Math.cos(a) * 16;
    const y = 32 + Math.sin(a) * 16;
    return `M32 32 Q ${32 + Math.cos(a + 0.2) * 8} ${32 + Math.sin(a + 0.2) * 8} ${x} ${y} Q ${32 + Math.cos(a - 0.2) * 8} ${32 + Math.sin(a - 0.2) * 8} 32 32`;
  });
  return (
    <Svg>
      {petals.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
      <circle cx="32" cy="32" r="5" fill="var(--panel)" stroke="currentColor" strokeWidth="1.2" />
    </Svg>
  );
}

function Tomoe() {
  return (
    <Svg>
      <g transform="translate(32 32)">
        {[0, 120, 240].map((rot) => (
          <path
            key={rot}
            transform={`rotate(${rot})`}
            fill="currentColor"
            d="M0-4 C 10-4 16 4 12 12 C 8 18 0 16 -2 8 C -3 2 -6-4 0-4 Z"
          />
        ))}
        <circle r="3.2" fill="var(--panel)" />
      </g>
    </Svg>
  );
}

function Kiri() {
  return (
    <Svg>
      {/* 五三桐 — three flower heads, 3-5-3 */}
      <g fill="currentColor">
        <ellipse cx="32" cy="22" rx="4.2" ry="5.5" />
        <ellipse cx="24" cy="24" rx="3.4" ry="4.6" />
        <ellipse cx="40" cy="24" rx="3.4" ry="4.6" />
        <ellipse cx="18" cy="28" rx="2.8" ry="3.8" />
        <ellipse cx="46" cy="28" rx="2.8" ry="3.8" />
        <path d="M20 34 Q32 30 44 34 L42 48 Q32 52 22 48 Z" />
        <rect x="30.4" y="46" width="3.2" height="8" />
      </g>
    </Svg>
  );
}

function Rinpo() {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return {
      x2: 32 + Math.cos(a) * 16,
      y2: 32 + Math.sin(a) * 16,
    };
  });
  return (
    <Svg>
      <circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" strokeWidth="2.2" />
      {spokes.map((s, i) => (
        <line key={i} x1="32" y1="32" x2={s.x2} y2={s.y2} stroke="currentColor" strokeWidth="2" />
      ))}
      <circle cx="32" cy="32" r="4.5" fill="currentColor" />
    </Svg>
  );
}

function Nobori() {
  return (
    <Svg>
      <rect x="21" y="12" width="2.4" height="40" fill="currentColor" />
      <path d="M23.4 13 H44 L40 22 L44 31 H23.4 Z" fill="currentColor" />
      <circle cx="22.2" cy="12" r="2" fill="currentColor" />
    </Svg>
  );
}

function Shippo() {
  return (
    <Svg>
      <g fill="none" stroke="currentColor" strokeWidth="2.1">
        <circle cx="32" cy="22" r="10" />
        <circle cx="32" cy="42" r="10" />
        <circle cx="22" cy="32" r="10" />
        <circle cx="42" cy="32" r="10" />
      </g>
    </Svg>
  );
}

function Nami() {
  return (
    <Svg>
      <path
        d="M16 28 Q24 20 32 28 T48 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M16 36 Q24 28 32 36 T48 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M16 44 Q24 36 32 44 T48 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Cho() {
  return (
    <Svg>
      <ellipse cx="22" cy="28" rx="10" ry="13" fill="currentColor" transform="rotate(-18 22 28)" />
      <ellipse cx="42" cy="28" rx="10" ry="13" fill="currentColor" transform="rotate(18 42 28)" />
      <ellipse cx="24" cy="42" rx="7" ry="8" fill="currentColor" transform="rotate(-28 24 42)" />
      <ellipse cx="40" cy="42" rx="7" ry="8" fill="currentColor" transform="rotate(28 40 42)" />
      <rect x="30.4" y="22" width="3.2" height="22" rx="1.4" fill="var(--panel)" />
      <circle cx="32" cy="22" r="2.2" fill="currentColor" />
    </Svg>
  );
}

function Shichiyo() {
  const stars = Array.from({ length: 7 }, (_, i) => {
    const a = ((i * 360) / 7 - 90) * (Math.PI / 180);
    return { cx: 32 + Math.cos(a) * 13.5, cy: 32 + Math.sin(a) * 13.5 };
  });
  return (
    <Svg>
      {stars.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="3.2" fill="currentColor" />
      ))}
    </Svg>
  );
}

function Ogi() {
  const ribs = [-48, -24, 0, 24, 48];
  return (
    <Svg>
      <path d="M16 30 Q32 10 48 30" fill="none" stroke="currentColor" strokeWidth="2.2" />
      {ribs.map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1="32"
            y1="46"
            x2={32 + Math.cos(a) * 20}
            y2={46 + Math.sin(a) * 20}
            stroke="currentColor"
            strokeWidth="1.7"
          />
        );
      })}
      <circle cx="32" cy="46" r="2.3" fill="currentColor" />
    </Svg>
  );
}

function Matsu() {
  return (
    <Svg>
      <path d="M32 50 V28" stroke="currentColor" strokeWidth="2.2" />
      <path d="M32 36 L22 24" stroke="currentColor" strokeWidth="2" />
      <path d="M32 36 L42 24" stroke="currentColor" strokeWidth="2" />
      <path d="M22 24 L16 16 M22 24 L24 14 M22 24 L28 16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M42 24 L36 16 M42 24 L40 14 M42 24 L48 16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M32 28 L26 16 M32 28 L32 12 M32 28 L38 16" stroke="currentColor" strokeWidth="1.6" />
    </Svg>
  );
}

function Tsuki() {
  return (
    <Svg>
      <circle cx="30" cy="32" r="12" fill="currentColor" />
      <circle cx="36" cy="28" r="10" fill="var(--panel)" />
    </Svg>
  );
}

function Tsuru() {
  return (
    <Svg>
      <path d="M18 40 Q28 18 40 22 Q48 24 46 32 Q44 40 34 42 Q24 44 18 40 Z" fill="currentColor" />
      <path d="M40 24 Q46 16 50 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 34 Q14 28 12 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="14" r="1.6" fill="currentColor" />
    </Svg>
  );
}

const MAP: Record<Motif, () => ReactNode> = {
  ume: Ume,
  ya: Ya,
  kiku: Kiku,
  tomoe: Tomoe,
  kiri: Kiri,
  rinpo: Rinpo,
  nobori: Nobori,
  shippo: Shippo,
  nami: Nami,
  cho: Cho,
  shichiyo: Shichiyo,
  ogi: Ogi,
  matsu: Matsu,
  tsuki: Tsuki,
  tsuru: Tsuru,
};

export function KamonMark({ motif }: { motif: Motif }) {
  const El = MAP[motif];
  return <El />;
}
