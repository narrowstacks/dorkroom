interface MatDiagramProps {
  valid: boolean;
  revealMode: boolean;
  ow: number;
  oh: number;
  bt: number;
  bb: number;
  bl: number;
  br: number;
  windowW: number;
  windowH: number;
  aw: number;
  ah: number;
  fmt: (v: number) => string;
}

// Theme tokens mapped to the dorkroom palette (SVG needs inline styles so
// var() resolves — presentation attributes do not).
const INK = 'var(--color-text-primary)';
const SOFT = 'var(--color-text-tertiary)';
const ACCENT = 'var(--color-primary)';
const PANEL = 'var(--color-surface)';

/**
 * To-scale plan of the mat: outer board (hatched), window opening, artwork
 * footprint, and dimensioned borders. Mirrors the layout drawing from the
 * original miter/mat cutter, restyled for dorkroom.
 */
export function MatDiagram({
  valid,
  revealMode,
  ow,
  oh,
  bt,
  bb,
  bl,
  br,
  windowW,
  windowH,
  aw,
  ah,
  fmt,
}: MatDiagramProps) {
  const vbW = 400;
  const pad = 48;
  const drawW = vbW - 2 * pad;
  const aspect = valid && ow > 0 ? oh / ow : 1.25;
  const drawH = drawW * aspect;
  const vbH = drawH + 2 * pad;
  const pxPerInch = valid ? drawW / ow : 0;
  const winLeft = pad + bl * pxPerInch;
  const winTop = pad + bt * pxPerInch;
  const winWpx = windowW * pxPerInch;
  const winHpx = windowH * pxPerInch;
  const artLeftPx = revealMode && valid ? pad + ((ow - aw) / 2) * pxPerInch : 0;
  const artTopPx = revealMode && valid ? pad + ((oh - ah) / 2) * pxPerInch : 0;
  const artWpx = revealMode ? aw * pxPerInch : 0;
  const artHpx = revealMode ? ah * pxPerInch : 0;

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: PANEL,
      }}
    >
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="block h-auto max-h-[460px] w-full"
      >
        <defs>
          <pattern
            id="hatch-mat"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              style={{ stroke: SOFT }}
              strokeWidth="0.5"
              opacity="0.35"
            />
          </pattern>
          <marker
            id="arrow-end-mat"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" style={{ fill: ACCENT }} />
          </marker>
        </defs>

        {revealMode && valid && (
          <rect
            x={artLeftPx}
            y={artTopPx}
            width={artWpx}
            height={artHpx}
            style={{ fill: ACCENT }}
            opacity="0.18"
          />
        )}

        <path
          d={`M ${pad} ${pad}
              L ${pad + drawW} ${pad}
              L ${pad + drawW} ${pad + drawH}
              L ${pad} ${pad + drawH} Z
              M ${winLeft} ${winTop}
              L ${winLeft} ${winTop + winHpx}
              L ${winLeft + winWpx} ${winTop + winHpx}
              L ${winLeft + winWpx} ${winTop} Z`}
          fill="url(#hatch-mat)"
          fillRule="evenodd"
        />

        <rect
          x={pad}
          y={pad}
          width={drawW}
          height={drawH}
          fill="none"
          style={{ stroke: INK }}
          strokeWidth="1.6"
        />

        <rect
          x={winLeft}
          y={winTop}
          width={winWpx}
          height={winHpx}
          fill="none"
          style={{ stroke: ACCENT }}
          strokeWidth="1.2"
        />

        {valid && (
          <g style={{ stroke: ACCENT }} strokeWidth="2" strokeLinecap="round">
            {[winLeft, winLeft + winWpx].map((x) => (
              <line
                key={`top-${x}`}
                x1={x}
                y1={pad - 6}
                x2={x}
                y2={winTop + 4}
              />
            ))}
            {[winLeft, winLeft + winWpx].map((x) => (
              <line
                key={`bot-${x}`}
                x1={x}
                y1={winTop + winHpx - 4}
                x2={x}
                y2={pad + drawH + 6}
              />
            ))}
            {[winTop, winTop + winHpx].map((y) => (
              <line
                key={`left-${y}`}
                x1={pad - 6}
                y1={y}
                x2={winLeft + 4}
                y2={y}
              />
            ))}
            {[winTop, winTop + winHpx].map((y) => (
              <line
                key={`right-${y}`}
                x1={winLeft + winWpx - 4}
                y1={y}
                x2={pad + drawW + 6}
                y2={y}
              />
            ))}
          </g>
        )}

        <text
          x={pad + drawW / 2}
          y={pad - 14}
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          className="font-mono"
          style={{ fill: ACCENT }}
        >
          {fmt(ow)}
        </text>
        <text
          x={pad + drawW / 2}
          y={pad - 26}
          textAnchor="middle"
          fontSize="8.5"
          letterSpacing="0.12em"
          className="font-mono"
          style={{ fill: SOFT }}
        >
          OUTER WIDTH
        </text>

        <g
          transform={`translate(${pad + drawW + 14}, ${pad + drawH / 2}) rotate(90)`}
        >
          <text
            textAnchor="middle"
            fontSize="12"
            fontWeight="500"
            className="font-mono"
            style={{ fill: ACCENT }}
          >
            {fmt(oh)}
          </text>
          <text
            textAnchor="middle"
            fontSize="8.5"
            letterSpacing="0.12em"
            y={-14}
            className="font-mono"
            style={{ fill: SOFT }}
          >
            OUTER HEIGHT
          </text>
        </g>

        {valid &&
          (() => {
            const labelW = 44;
            const labelH = 14;
            const winCx = winLeft + winWpx / 2;
            const winCy = winTop + winHpx / 2;
            const topCy = (pad + winTop) / 2;
            const botCy = (winTop + winHpx + pad + drawH) / 2;
            const leftCx = (pad + winLeft) / 2;
            const rightCx = (winLeft + winWpx + pad + drawW) / 2;
            const arrows = [
              {
                key: 'top',
                line: { x1: winCx, y1: pad + 2, x2: winCx, y2: winTop - 2 },
                tx: winCx,
                ty: topCy,
                value: fmt(bt),
              },
              {
                key: 'bot',
                line: {
                  x1: winCx,
                  y1: winTop + winHpx + 2,
                  x2: winCx,
                  y2: pad + drawH - 2,
                },
                tx: winCx,
                ty: botCy,
                value: fmt(bb),
              },
              {
                key: 'left',
                line: { x1: pad + 2, y1: winCy, x2: winLeft - 2, y2: winCy },
                tx: leftCx,
                ty: winCy,
                value: fmt(bl),
              },
              {
                key: 'right',
                line: {
                  x1: winLeft + winWpx + 2,
                  y1: winCy,
                  x2: pad + drawW - 2,
                  y2: winCy,
                },
                tx: rightCx,
                ty: winCy,
                value: fmt(br),
              },
            ];
            return (
              <g>
                {arrows.map((a) => (
                  <line
                    key={`l-${a.key}`}
                    x1={a.line.x1}
                    y1={a.line.y1}
                    x2={a.line.x2}
                    y2={a.line.y2}
                    style={{ stroke: ACCENT }}
                    strokeWidth="0.9"
                    markerStart="url(#arrow-end-mat)"
                    markerEnd="url(#arrow-end-mat)"
                  />
                ))}
                {arrows.map((a) => (
                  <rect
                    key={`r-${a.key}`}
                    x={a.tx - labelW / 2}
                    y={a.ty - labelH / 2}
                    width={labelW}
                    height={labelH}
                    style={{ fill: PANEL }}
                  />
                ))}
                {arrows.map((a) => (
                  <text
                    key={`t-${a.key}`}
                    x={a.tx}
                    y={a.ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="500"
                    className="font-mono"
                    style={{ fill: ACCENT }}
                  >
                    {a.value}
                  </text>
                ))}
              </g>
            );
          })()}

        <text
          x={winLeft + winWpx / 2}
          y={winTop + winHpx / 2 - 4}
          textAnchor="middle"
          fontSize="9"
          letterSpacing="0.18em"
          className="font-mono"
          style={{ fill: SOFT }}
        >
          WINDOW
        </text>
        <text
          x={winLeft + winWpx / 2}
          y={winTop + winHpx / 2 + 12}
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          className="font-mono"
          style={{ fill: ACCENT }}
        >
          {fmt(windowW)} × {fmt(windowH)}
        </text>
      </svg>
    </div>
  );
}
