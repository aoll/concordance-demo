import type { ZoneOccupancy } from '@concordance/api-client';
import { fillOf } from '../zones/fill';
import { LINES, MARNE, SEINE, STATIONS, TERMINI, WOODS } from './geometry';

interface ZoneMapProps {
  zones: ZoneOccupancy[];
  /** Id of the selected zone. */
  selected: string | undefined;
  onSelect: (zoneId: string) => void;
  /** Ids of the zones that just changed in real time: a brief flash catches the eye. */
  flashing?: ReadonlySet<string>;
}

/**
 * SVG map from the mockup. Layer order: background, RER lines, stations, then the zones
 * above the lines so they stay clickable, and finally the labels. Zones are
 * drawn from the API (outline and label in the database): no hard-coded list.
 */
export function ZoneMap({ zones, selected, onSelect, flashing }: ZoneMapProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: an <svg> cannot be a <fieldset>.
    <svg
      className="map"
      viewBox="0 0 800 600"
      role="group"
      aria-label="Plan schématique de l'Île-de-France et zones du réseau"
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

      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: decorative background, nothing in it is focusable. */}
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
        const fill = fillOf(zone);
        const isSelected = zone.id === selected;
        return (
          // biome-ignore lint/a11y/useSemanticElements: an SVG <path> cannot be a <button>.
          <g
            key={zone.id}
            data-zone-id={zone.id}
            className={`zone fill-${fill.key}${isSelected ? ' sel' : ''}${flashing?.has(zone.id) ? ' flash' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${zone.name}, ${zone.occupied} sur ${zone.capacity}`}
            onClick={() => onSelect(zone.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(zone.id);
              }
            }}
          >
            <path className="base" d={zone.shape.path} />
            {fill.key === 'full' && (
              <path className="hatch" d={zone.shape.path} fill="url(#hatch)" />
            )}
          </g>
        );
      })}

      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: labels duplicating the zones' aria-label. */}
      <g aria-hidden="true">
        {zones.map((zone) => {
          const { x, y } = zone.shape.label;
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
                data-testid={`count-${zone.name}`}
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
