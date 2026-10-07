import type { ZoneOccupancy } from '@concordance/api-client';
import type { ZoneSlug } from '@concordance/contracts';
import { fillOf } from '../zones/fill';
import { LINES, MARNE, SEINE, STATIONS, TERMINI, WOODS, ZONE_SHAPES } from './geometry';

interface ZoneMapProps {
  zones: ZoneOccupancy[];
  selected: ZoneSlug | undefined;
  onSelect: (slug: ZoneSlug) => void;
}

/**
 * Carte SVG de la maquette. Ordre des calques : fond, lignes RER, gares, puis les zones
 * au-dessus des lignes pour rester cliquables, et enfin les étiquettes.
 */
export function ZoneMap({ zones, selected, onSelect }: ZoneMapProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: un <svg> ne peut pas être un <fieldset>.
    <svg
      className="map"
      viewBox="0 0 800 600"
      role="group"
      aria-label="Plan schématique de l'Île-de-France avec six zones"
    >
      <defs>
        <pattern
          id="hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" className="hatch-line" />
        </pattern>
        <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity=".22" />
        </filter>
        <radialGradient id="ground" cx="53%" cy="49%" r="70%">
          <stop offset="0" className="ground-hi" />
          <stop offset="1" className="ground-lo" />
        </radialGradient>
      </defs>

      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: fond décoratif, rien n'y est focusable. */}
      <g aria-hidden="true" className="backdrop">
        <rect width="800" height="600" fill="url(#ground)" />
        <ellipse className="ring" cx="422" cy="292" rx="190" ry="152" />
        {WOODS.map(([cx, cy, rx, ry]) => (
          <ellipse key={`${cx}-${cy}`} className="wood" cx={cx} cy={cy} rx={rx} ry={ry} />
        ))}
        <path className="river" strokeWidth="11" d={SEINE} />
        <path className="river" strokeWidth="6" d={MARNE} />
        {LINES.map((line) => (
          <path key={`casing-${line.d}`} className="casing" d={line.d} />
        ))}
        {LINES.map((line) => (
          <path key={line.d} className="line" d={line.d} stroke={line.color} />
        ))}
        <path className="orlyval" d="M414,430 L470,462" />
        {STATIONS.map(([a, b]) => (
          <g key={`${a[0]}-${a[1]}`}>
            <line className="st-out" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
            <line className="st-in" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
          </g>
        ))}
        {TERMINI.map((terminus) => (
          <g key={`${terminus.at[0]}-${terminus.at[1]}`}>
            <circle
              className="roundel"
              cx={terminus.at[0]}
              cy={terminus.at[1]}
              r="10"
              fill={terminus.color}
            />
            <text className="rletter" x={terminus.at[0]} y={terminus.at[1] + 4} textAnchor="middle">
              {terminus.line}
            </text>
          </g>
        ))}
      </g>

      {zones.map((zone) => {
        const shape = ZONE_SHAPES[zone.slug];
        const fill = fillOf(zone);
        const isSelected = zone.slug === selected;
        return (
          // biome-ignore lint/a11y/useSemanticElements: un <path> SVG ne peut pas être un <button>.
          <g
            key={zone.id}
            id={zone.slug}
            className={`zone fill-${fill.key}${isSelected ? ' sel' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${zone.name}, ${zone.occupied} sur ${zone.capacity}`}
            onClick={() => onSelect(zone.slug)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(zone.slug);
              }
            }}
          >
            <path className="base" d={shape.d} />
            {fill.key === 'full' && <path className="hatch" d={shape.d} fill="url(#hatch)" />}
          </g>
        );
      })}

      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: étiquettes doublant l'aria-label des zones. */}
      <g aria-hidden="true">
        {zones.map((zone) => {
          const [x, y] = ZONE_SHAPES[zone.slug].label;
          const fill = fillOf(zone);
          return (
            <g key={zone.id} className={`zl fill-${fill.key}`} transform={`translate(${x} ${y})`}>
              <text className="name" textAnchor="middle">
                {zone.name}
              </text>
              <rect className="badge" x="-26" y="6" width="52" height="20" rx="10" />
              <circle className="dot" cx="-14" cy="16" r="4" />
              <text
                className="cnt"
                x="5"
                y="20"
                textAnchor="middle"
                data-testid={`count-${zone.slug}`}
              >
                {zone.occupied}/{zone.capacity}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
