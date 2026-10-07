/**
 * Background of the Île-de-France schematic map taken from the validated mockup (viewBox 800 × 600):
 * Seine, Marne, RER and stations, purely decorative. The zones, on the other hand, come from the API
 * (outline and label in the database, `zone.shape`).
 */
type Point = readonly [number, number];

/** Polyline with rounded corners, transit-map style. */
export function rounded(points: readonly Point[], radius: number): string {
  const [first, ...rest] = points;
  if (!first) return '';
  let d = `M${first[0]},${first[1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [p0, p1, p2] = [points[i - 1], points[i], points[i + 1]] as [Point, Point, Point];
    const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const ax = p1[0] - ((p1[0] - p0[0]) * r) / l1;
    const ay = p1[1] - ((p1[1] - p0[1]) * r) / l1;
    const bx = p1[0] + ((p2[0] - p1[0]) * r) / l2;
    const by = p1[1] + ((p2[1] - p1[1]) * r) / l2;
    d += ` L${ax.toFixed(1)},${ay.toFixed(1)} Q${p1[0]},${p1[1]} ${bx.toFixed(1)},${by.toFixed(1)}`;
  }
  const last = rest.at(-1) ?? first;
  return `${d} L${last[0]},${last[1]}`;
}

/** Smoothed closed outline (Catmull-Rom) for the zones. */
export function blob(points: readonly Point[]): string {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n] as Point;
  let d = `M${at(0)[0]},${at(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]?.toFixed(1)},${c1[1]?.toFixed(1)} ${c2[0]?.toFixed(1)},${c2[1]?.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return `${d} Z`;
}

const RER = { A: '#e2312a', B: '#4a7fd0', C: '#e4b31c', D: '#2f9a57', E: '#a056ad' } as const;
type Rer = keyof typeof RER;

export const LINES: { color: string; d: string }[] = (
  [
    [
      'A',
      [
        [110, 190],
        [192, 272],
        [365, 272],
        [420, 280],
        [470, 300],
        [560, 300],
        [720, 300],
      ],
    ],
    [
      'A',
      [
        [560, 300],
        [680, 420],
      ],
    ],
    [
      'B',
      [
        [560, 70],
        [436, 194],
        [436, 244],
        [414, 282],
        [414, 430],
        [334, 510],
      ],
    ],
    [
      'C',
      [
        [150, 400],
        [210, 340],
        [300, 340],
        [338, 318],
        [420, 302],
        [462, 322],
        [462, 410],
        [520, 468],
        [520, 560],
      ],
    ],
    [
      'D',
      [
        [500, 50],
        [500, 148],
        [456, 192],
        [456, 244],
        [430, 276],
        [478, 304],
        [536, 362],
        [606, 432],
        [606, 560],
      ],
    ],
    [
      'E',
      [
        [244, 256],
        [300, 256],
        [318, 238],
        [520, 238],
        [548, 210],
        [720, 210],
      ],
    ],
  ] satisfies [Rer, Point[]][]
).map(([line, points]) => ({ color: RER[line], d: rounded(points, 16) }));

/** Terminus roundels (line letter, no station name: clean map). */
export const TERMINI: { line: Rer; color: string; at: Point }[] = (
  [
    ['A', [110, 190]],
    ['A', [720, 300]],
    ['A', [680, 420]],
    ['B', [560, 70]],
    ['B', [334, 510]],
    ['C', [150, 400]],
    ['C', [520, 560]],
    ['D', [500, 50]],
    ['D', [606, 560]],
    ['E', [720, 210]],
  ] satisfies [Rer, Point][]
).map(([line, at]) => ({ line, color: RER[line], at }));

/** Interchange stations, as white capsules (no label). */
export const STATIONS: [Point, Point][] = [
  [
    [262, 256],
    [262, 272],
  ],
  [
    [464, 166],
    [473, 175],
  ],
  [
    [436, 238],
    [456, 238],
  ],
  [
    [414, 281],
    [430, 276],
  ],
  [
    [470, 300],
    [478, 304],
  ],
  [
    [365, 272],
    [365, 272],
  ],
  [
    [395, 238],
    [395, 238],
  ],
  [
    [414, 345],
    [414, 345],
  ],
  [
    [414, 430],
    [414, 430],
  ],
  [
    [470, 462],
    [470, 462],
  ],
];

export const WOODS: [cx: number, cy: number, rx: number, ry: number][] = [
  [160, 226, 42, 22],
  [300, 372, 24, 13],
  [562, 474, 32, 17],
  [343, 296, 9, 16],
  [512, 306, 14, 9],
  [640, 160, 34, 16],
];

export const SEINE =
  'M770,520 C700,470 640,430 600,405 C560,380 535,340 512,318 C482,300 452,288 422,290 C392,292 360,304 334,318 C305,334 300,300 322,268 C342,236 330,192 292,178 C240,160 160,190 50,215';
export const MARNE = 'M770,262 C700,300 640,334 565,334 C540,334 525,326 512,318';
