/**
 * Original vector illustrations used as clearly-labelled placeholder imagery for the demo catalogue.
 * Replace with real product photography via Admin › Products › Images.
 */

export type ArtShape =
  | "ring-solitaire"
  | "ring-band"
  | "ring-cluster"
  | "ring-signet"
  | "earring-stud"
  | "earring-drop"
  | "earring-jhumka"
  | "earring-hoop"
  | "necklace"
  | "necklace-choker"
  | "pendant"
  | "chain"
  | "bangle"
  | "kada"
  | "bracelet"
  | "mangalsutra"
  | "nosepin"
  | "anklet"
  | "set";

export type ArtMetal = "yellow" | "rose" | "white" | "silver";
export type ArtStone = "none" | "diamond" | "ruby" | "emerald" | "sapphire" | "pearl" | "polki" | "kundan";

const METALS: Record<ArtMetal, string[]> = {
  yellow: ["#FFF3C4", "#EBC866", "#B98A2E", "#F6D98A", "#8A6420"],
  rose: ["#FFE4DA", "#E8AD97", "#B26F5A", "#F3C5B1", "#87503F"],
  white: ["#FFFFFF", "#DCDFE5", "#9EA4AF", "#F0F2F5", "#6F7682"],
  silver: ["#FBFBFB", "#D2D6DB", "#8F959D", "#E9EBEE", "#646A72"],
};

const STONES: Record<Exclude<ArtStone, "none">, [string, string, string]> = {
  diamond: ["#FFFFFF", "#E3EEF7", "#A9C3D9"],
  ruby: ["#F0566F", "#B3123A", "#5E0618"],
  emerald: ["#5FD3A2", "#128A5C", "#04412A"],
  sapphire: ["#6E9BF0", "#1E4FBF", "#0A2463"],
  pearl: ["#FFFFFF", "#F2ECE2", "#D6C9B5"],
  polki: ["#FBF8F2", "#ECE4D6", "#C9BBA3"],
  kundan: ["#FFF6DA", "#F0DFA8", "#C8A85C"],
};

const BACKDROPS = [
  { a: "#FBF7F1", b: "#EFE5D6", text: "#9B8F7D", shadow: "#6B5A3E" },
  { a: "#F6ECE4", b: "#E6D3C4", text: "#957F6E", shadow: "#6B4E3E" },
  { a: "#3A302C", b: "#1C1715", text: "#B9A98F", shadow: "#000000" },
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function defs(metal: ArtMetal, stone: ArtStone, uid: string) {
  const m = METALS[metal];
  const s = stone === "none" ? null : STONES[stone];
  return `
  <linearGradient id="m${uid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${m[0]}"/><stop offset=".35" stop-color="${m[1]}"/>
    <stop offset=".62" stop-color="${m[2]}"/><stop offset=".85" stop-color="${m[3]}"/><stop offset="1" stop-color="${m[4]}"/>
  </linearGradient>
  <linearGradient id="mv${uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${m[3]}"/><stop offset=".5" stop-color="${m[2]}"/><stop offset="1" stop-color="${m[4]}"/>
  </linearGradient>
  ${
    s
      ? `<radialGradient id="s${uid}" cx=".38" cy=".32" r=".75">
    <stop offset="0" stop-color="${s[0]}"/><stop offset=".55" stop-color="${s[1]}"/><stop offset="1" stop-color="${s[2]}"/>
  </radialGradient>`
      : ""
  }
  <radialGradient id="beads${uid}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5a5a5a"/><stop offset="1" stop-color="#0b0b0b"/></radialGradient>
  <filter id="soft${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="glow${uid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`;
}

function gem(x: number, y: number, r: number, stone: ArtStone, uid: string, metalFill: string): string {
  if (stone === "none") {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${metalFill}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.28}" fill="#fff" opacity=".55"/>`;
  }
  const prongs = [0, 90, 180, 270]
    .map((a) => {
      const rad = ((a + 45) * Math.PI) / 180;
      return `<circle cx="${x + Math.cos(rad) * r * 0.98}" cy="${y + Math.sin(rad) * r * 0.98}" r="${Math.max(2, r * 0.16)}" fill="${metalFill}"/>`;
    })
    .join("");
  let facets = "";
  if (stone === "diamond") {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return [x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55];
    });
    facets =
      `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#9fb7cc" stroke-width="${Math.max(0.6, r * 0.04)}" opacity=".8"/>` +
      pts.map(([px, py]) => `<line x1="${px}" y1="${py}" x2="${x + (px - x) * 1.8}" y2="${y + (py - y) * 1.8}" stroke="#a8c0d4" stroke-width="${Math.max(0.5, r * 0.03)}" opacity=".7"/>`).join("") +
      `<circle cx="${x - r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.12}" fill="#fff" filter="url(#glow${uid})"/>`;
  } else if (stone === "polki" || stone === "kundan") {
    facets = `<circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="#fff" stroke-width="${r * 0.05}" opacity=".7"/>`;
  } else if (stone !== "pearl") {
    facets = `<ellipse cx="${x - r * 0.25}" cy="${y - r * 0.3}" rx="${r * 0.35}" ry="${r * 0.18}" fill="#fff" opacity=".45" transform="rotate(-30 ${x} ${y})"/>`;
  } else {
    facets = `<circle cx="${x - r * 0.32}" cy="${y - r * 0.32}" r="${r * 0.22}" fill="#fff" opacity=".9" filter="url(#glow${uid})"/>`;
  }
  const bezel = stone === "kundan" ? `<circle cx="${x}" cy="${y}" r="${r * 1.18}" fill="${metalFill}"/>` : "";
  return `${bezel}<circle cx="${x}" cy="${y}" r="${r}" fill="url(#s${uid})"/>${facets}${stone === "pearl" || stone === "kundan" ? "" : prongs}`;
}

function along(path: (t: number) => [number, number], n: number, fn: (x: number, y: number, i: number, t: number) => string, from = 0, to = 1) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const t = from + ((to - from) * i) / Math.max(1, n - 1);
    const [x, y] = path(t);
    out += fn(x, y, i, t);
  }
  return out;
}

function quad(p0: [number, number], c: [number, number], p1: [number, number]) {
  return (t: number): [number, number] => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t ** 2 * p1[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t ** 2 * p1[1],
  ];
}

function drawShape(shape: ArtShape, stone: ArtStone, uid: string, alt: number): string {
  const M = `url(#m${uid})`;
  const MV = `url(#mv${uid})`;
  const accent: ArtStone = stone;
  switch (shape) {
    case "ring-solitaire":
    case "ring-cluster":
    case "ring-band":
    case "ring-signet": {
      let head = "";
      if (shape === "ring-solitaire") {
        head = `<path d="M370 330 L400 300 L430 330 Z" fill="${M}"/>` + gem(400, 300, 46, accent === "none" ? "diamond" : accent, uid, M);
      } else if (shape === "ring-cluster") {
        head =
          gem(400, 318, 30, accent, uid, M) +
          [0, 60, 120, 180, 240, 300].map((a) => {
            const r = (a * Math.PI) / 180;
            return gem(400 + Math.cos(r) * 46, 318 + Math.sin(r) * 46, 16, accent === "none" ? "diamond" : accent === "ruby" || accent === "emerald" || accent === "sapphire" ? "diamond" : accent, uid, M);
          }).join("");
      } else if (shape === "ring-signet") {
        head = `<rect x="330" y="292" width="140" height="92" rx="22" fill="${M}"/><rect x="346" y="306" width="108" height="64" rx="14" fill="none" stroke="${METALS.yellow[4]}" stroke-opacity=".35" stroke-width="3"/><path d="M372 352 l28 -30 l28 30" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5"/>`;
      } else if (stone !== "none") {
        head = along((t) => [400 + Math.cos(Math.PI + t * Math.PI) * 152, 520 + Math.sin(Math.PI + t * Math.PI) * 152], 9, (x, y) => gem(x, y, 11, accent, uid, M), 0.12, 0.88);
      }
      const width = shape === "ring-band" || shape === "ring-signet" ? 40 : 26;
      return `
      <ellipse cx="400" cy="526" rx="160" ry="160" fill="none" stroke="${MV}" stroke-width="${width + 6}" opacity=".55"/>
      <circle cx="400" cy="520" r="158" fill="none" stroke="${M}" stroke-width="${width}"/>
      <path d="M262 470 A150 150 0 0 1 340 380" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
      ${head}`;
    }
    case "earring-stud": {
      const one = (x: number) =>
        stone === "none"
          ? `<circle cx="${x}" cy="480" r="58" fill="${M}"/><circle cx="${x}" cy="480" r="34" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="4"/>`
          : gem(x, 480, 30, stone, uid, M) +
            along((t) => [x + Math.cos(t * Math.PI * 2) * 58, 480 + Math.sin(t * Math.PI * 2) * 58], 10, (gx, gy) => gem(gx, gy, 13, stone === "pearl" ? "diamond" : stone, uid, M), 0, 0.9);
      return one(280) + one(520);
    }
    case "earring-drop":
    case "earring-hoop":
    case "earring-jhumka": {
      const one = (x: number) => {
        const top = gem(x, 250, 22, stone === "none" ? "none" : stone === "pearl" ? "diamond" : stone, uid, M);
        if (shape === "earring-hoop") {
          return `<circle cx="${x}" cy="420" r="120" fill="none" stroke="${M}" stroke-width="20"/>` + (stone !== "none" ? along((t) => [x + Math.cos(Math.PI * 0.15 + t * Math.PI * 0.7) * 120, 420 + Math.sin(Math.PI * 0.15 + t * Math.PI * 0.7) * 120], 7, (gx, gy) => gem(gx, gy, 10, stone, uid, M)) : "");
        }
        if (shape === "earring-jhumka") {
          return `${top}<line x1="${x}" y1="272" x2="${x}" y2="330" stroke="${M}" stroke-width="7"/>
          <path d="M${x - 95} 520 Q${x - 90} 345 ${x} 335 Q${x + 90} 345 ${x + 95} 520 Z" fill="${M}"/>
          <path d="M${x - 70} 470 Q${x} 440 ${x + 70} 470" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5"/>
          ${along((t) => [x - 92 + t * 184, 532], 9, (gx, gy) => (stone === "pearl" || stone === "none" ? gem(gx, gy + 6, 10, "pearl", uid, M) : gem(gx, gy + 6, 9, stone, uid, M)))}
          ${gem(x, 420, 18, stone === "none" ? "ruby" : stone, uid, M)}`;
        }
        return `${top}<line x1="${x}" y1="272" x2="${x}" y2="330" stroke="${M}" stroke-width="6"/>
          <path d="M${x} 330 C ${x + 80} 420, ${x + 70} 560, ${x} 590 C ${x - 70} 560, ${x - 80} 420, ${x} 330 Z" fill="${M}"/>
          ${gem(x, 500, stone === "pearl" ? 44 : 36, stone === "none" ? "none" : stone, uid, M)}`;
      };
      return one(270) + one(530);
    }
    case "necklace":
    case "necklace-choker":
    case "set": {
      const choker = shape === "necklace-choker";
      const curve = choker ? quad([170, 230], [400, 640], [630, 230]) : quad([150, 160], [400, 760], [650, 160]);
      const chain = `<path d="${choker ? "M170 230 Q400 640 630 230" : "M150 160 Q400 760 650 160"}" fill="none" stroke="${M}" stroke-width="${choker ? 26 : 9}"/>`;
      const big = stone === "none" ? "none" : stone;
      const drops = along(curve, choker || shape === "set" ? 11 : 7, (x, y, i) => {
        const r = choker ? 15 : 13;
        const g = gem(x, y, r, big, uid, M);
        const dangle = choker || i % 2 === 0 ? `<line x1="${x}" y1="${y + r}" x2="${x}" y2="${y + r + 22}" stroke="${M}" stroke-width="3"/>${gem(x, y + r + 32, 9, stone === "polki" || stone === "kundan" ? "pearl" : big, uid, M)}` : "";
        return dangle + g;
      }, 0.22, 0.78);
      const centre = `<path d="M400 ${choker ? 436 : 462} C 450 ${choker ? 480 : 520}, 450 ${choker ? 560 : 600}, 400 ${choker ? 610 : 650} C 350 ${choker ? 560 : 600}, 350 ${choker ? 480 : 520}, 400 ${choker ? 436 : 462} Z" fill="${M}"/>${gem(400, choker ? 530 : 560, 34, big === "none" ? "none" : big, uid, M)}`;
      const studs = shape === "set" ? gem(120, 760, 26, big === "none" ? "none" : big, uid, M) + gem(680, 760, 26, big === "none" ? "none" : big, uid, M) + `<path d="M120 786 C 150 830, 140 880, 120 900 C 100 880, 90 830, 120 786Z" fill="${M}"/><path d="M680 786 C 710 830, 700 880, 680 900 C 660 880, 650 830, 680 786Z" fill="${M}"/>` : "";
      return chain + drops + centre + studs;
    }
    case "pendant": {
      const shapeAlt = alt % 3;
      const body =
        shapeAlt === 0
          ? `<path d="M400 640 C 300 560, 300 470, 350 450 C 380 440, 400 465, 400 480 C 400 465, 420 440, 450 450 C 500 470, 500 560, 400 640 Z" fill="${M}"/>${gem(400, 535, 28, stone, uid, M)}`
          : shapeAlt === 1
            ? `<circle cx="400" cy="540" r="92" fill="${M}"/><circle cx="400" cy="540" r="70" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4"/>${gem(400, 540, 36, stone, uid, M)}`
            : `<path d="M400 430 C 470 520, 470 600, 400 650 C 330 600, 330 520, 400 430 Z" fill="${M}"/>${gem(400, 566, 34, stone, uid, M)}`;
      return `<path d="M200 120 L400 ${shapeAlt === 2 ? 410 : 432} L600 120" fill="none" stroke="${M}" stroke-width="5"/>
        <rect x="388" y="${shapeAlt === 2 ? 400 : 420}" width="24" height="34" rx="9" fill="none" stroke="${M}" stroke-width="7"/>${body}`;
    }
    case "chain": {
      const curve = quad([150, 150], [400, 820], [650, 150]);
      return along(curve, 30, (x, y, i, t) => {
        const ang = Math.atan2(2 * (1 - t) * (400 - 150) + 2 * t * (650 - 400), 2 * (1 - t) * (820 - 150) + 2 * t * (150 - 820)) * (180 / Math.PI);
        return `<ellipse cx="${x}" cy="${y}" rx="17" ry="10" fill="none" stroke="${M}" stroke-width="6" transform="rotate(${-ang + (i % 2 ? 90 : 0)} ${x} ${y})"/>`;
      });
    }
    case "bangle":
    case "kada": {
      const kada = shape === "kada";
      const count = kada ? 1 : 2;
      let out = "";
      for (let b = 0; b < count; b++) {
        const dy = b * 70 - (count - 1) * 35;
        out += `<ellipse cx="400" cy="${500 + dy}" rx="230" ry="${kada ? 120 : 95}" fill="none" stroke="${MV}" stroke-width="${kada ? 56 : 30}"/>
        <ellipse cx="400" cy="${494 + dy}" rx="230" ry="${kada ? 120 : 95}" fill="none" stroke="${M}" stroke-width="${kada ? 46 : 22}"/>`;
        if (kada) {
          out += along((t) => [400 + Math.cos(Math.PI * 0.15 + t * Math.PI * 0.7) * 230, 494 + dy + Math.sin(Math.PI * 0.15 + t * Math.PI * 0.7) * 120], 16, (x, y) => `<line x1="${x}" y1="${y - 18}" x2="${x}" y2="${y + 18}" stroke="${METALS.yellow[4]}" stroke-opacity=".35" stroke-width="3"/>`);
        } else if (stone !== "none") {
          out += along((t) => [400 + Math.cos(Math.PI * 0.12 + t * Math.PI * 0.76) * 230, 494 + dy + Math.sin(Math.PI * 0.12 + t * Math.PI * 0.76) * 95], 11, (x, y) => gem(x, y, 9, stone, uid, M));
        }
      }
      return out;
    }
    case "bracelet": {
      const pathFn = (t: number): [number, number] => [400 + Math.cos(t * Math.PI * 2) * 250, 500 + Math.sin(t * Math.PI * 2) * 110];
      return `<ellipse cx="400" cy="500" rx="250" ry="110" fill="none" stroke="${M}" stroke-width="12"/>` +
        along(pathFn, 28, (x, y) => (stone === "none" ? `<rect x="${x - 11}" y="${y - 9}" width="22" height="18" rx="6" fill="${M}"/>` : gem(x, y, 12, stone, uid, M)), 0, 0.965);
    }
    case "mangalsutra": {
      const left = quad([170, 150], [210, 520], [380, 600]);
      const right = quad([630, 150], [590, 520], [420, 600]);
      const beads = (fn: (t: number) => [number, number]) =>
        along(fn, 22, (x, y, i) => (i % 5 === 4 ? `<circle cx="${x}" cy="${y}" r="9" fill="${M}"/>` : `<circle cx="${x}" cy="${y}" r="8" fill="url(#beads${uid})"/>`));
      return beads(left) + beads(right) +
        `<circle cx="400" cy="615" r="16" fill="none" stroke="${M}" stroke-width="7"/>
        <circle cx="365" cy="690" r="52" fill="${M}"/><circle cx="435" cy="690" r="52" fill="${M}"/>
        <circle cx="365" cy="690" r="34" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><circle cx="435" cy="690" r="34" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
        ${stone !== "none" ? gem(400, 690, 18, stone, uid, M) : ""}`;
    }
    case "nosepin": {
      const s = stone === "none" ? "diamond" : stone;
      return [0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return `<ellipse cx="${400 + Math.cos(r) * 70}" cy="${480 + Math.sin(r) * 70}" rx="52" ry="34" fill="${M}" transform="rotate(${a} ${400 + Math.cos(r) * 70} ${480 + Math.sin(r) * 70})"/>` + gem(400 + Math.cos(r) * 74, 480 + Math.sin(r) * 74, 18, s, uid, M);
      }).join("") + gem(400, 480, 34, s, uid, M);
    }
    case "anklet": {
      const fn = (t: number): [number, number] => [130 + t * 540, 420 + Math.sin(t * Math.PI * 3) * 40 + Math.sin(t * Math.PI) * 120];
      return along(fn, 40, (x, y, i) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${M}" stroke-width="4"/>` + (i % 5 === 2 ? `<line x1="${x}" y1="${y + 7}" x2="${x}" y2="${y + 36}" stroke="${M}" stroke-width="3"/><circle cx="${x}" cy="${y + 50}" r="15" fill="${M}"/><line x1="${x - 9}" y1="${y + 56}" x2="${x + 9}" y2="${y + 56}" stroke="${METALS.silver[4]}" stroke-width="3"/>` : "") + (stone !== "none" && i % 5 === 0 ? gem(x, y, 8, stone, uid, M) : ""));
    }
  }
}

export function productSvg(opts: { shape: ArtShape; metal: ArtMetal; stone: ArtStone; view: 0 | 1 | 2; seed: string }): string {
  const uid = (hash(opts.seed + opts.view) % 1e6).toString(36);
  const bd = BACKDROPS[opts.view];
  const scale = opts.view === 1 ? 1.22 : opts.view === 2 ? 0.92 : 1;
  const rot = opts.view === 1 ? -8 : opts.view === 2 ? 6 : 0;
  const alt = hash(opts.seed) % 7;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000" role="img">
<defs>${defs(opts.metal, opts.stone, uid)}
  <radialGradient id="bg${uid}" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="${bd.a}"/><stop offset="1" stop-color="${bd.b}"/></radialGradient>
</defs>
<rect width="800" height="1000" fill="url(#bg${uid})"/>
${opts.view === 2 ? `<circle cx="400" cy="480" r="330" fill="#fff" opacity=".04"/>` : ""}
<ellipse cx="400" cy="870" rx="260" ry="26" fill="${bd.shadow}" opacity=".16" filter="url(#soft${uid})"/>
<g transform="translate(400 500) scale(${scale}) rotate(${rot}) translate(-400 -500)">
${drawShape(opts.shape, opts.stone, uid, alt)}
</g>
<text x="770" y="975" text-anchor="end" font-family="Georgia, serif" font-size="18" letter-spacing="2" fill="${bd.text}" opacity=".85">ILLUSTRATION</text>
</svg>`;
}

/** Large editorial artwork for banners and tiles. */
export function sceneSvg(opts: {
  width: number;
  height: number;
  palette: "velvet" | "ivory" | "emerald" | "blush" | "midnight" | "champagne";
  items: { shape: ArtShape; metal: ArtMetal; stone: ArtStone; x: number; y: number; scale: number; rotate?: number }[];
  seed: string;
}): string {
  const palettes = {
    velvet: ["#4A2C2A", "#1E1211", "#C9A46A"],
    ivory: ["#FBF7F0", "#EADFCF", "#B08D57"],
    emerald: ["#1F4D3F", "#0B231C", "#D8B46A"],
    blush: ["#F6E3DA", "#E2C2B3", "#A86F5B"],
    midnight: ["#23283A", "#0E1019", "#C9B27A"],
    champagne: ["#F3E7D1", "#DCC7A2", "#8E6E3A"],
  } as const;
  const [a, b, line] = palettes[opts.palette];
  const uid = (hash(opts.seed) % 1e6).toString(36);
  const items = opts.items
    .map((it, i) => {
      const iu = `${uid}${i}`;
      return `<defs>${defs(it.metal, it.stone, iu)}</defs><g transform="translate(${it.x} ${it.y}) scale(${it.scale}) rotate(${it.rotate ?? 0}) translate(-400 -500)">${drawShape(it.shape, it.stone, iu, i)}</g>`;
    })
    .join("");
  const dark = ["velvet", "emerald", "midnight"].includes(opts.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.width} ${opts.height}" width="${opts.width}" height="${opts.height}" role="img" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="bg${uid}" cx=".62" cy=".45" r=".85"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#bg${uid})"/>
<circle cx="${opts.width * 0.68}" cy="${opts.height * 0.5}" r="${Math.min(opts.width, opts.height) * 0.42}" fill="none" stroke="${line}" stroke-opacity="${dark ? 0.25 : 0.3}" stroke-width="1.5"/>
<circle cx="${opts.width * 0.68}" cy="${opts.height * 0.5}" r="${Math.min(opts.width, opts.height) * 0.46}" fill="none" stroke="${line}" stroke-opacity="${dark ? 0.12 : 0.15}" stroke-width="1"/>
${items}
<text x="${opts.width - 24}" y="${opts.height - 20}" text-anchor="end" font-family="Georgia, serif" font-size="14" letter-spacing="2" fill="${line}" opacity=".8">ILLUSTRATION</text>
</svg>`;
}
