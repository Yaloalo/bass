import { useRef } from 'react';

const sweep = 270;
const start = 135;

/**
 * A plugin-style rotary control. It is a real ARIA slider: arrows step, Page keys jump,
 * Home/End reach the limits, and a vertical drag turns it. Horizontal drag is ignored on
 * purpose, so turning a knob on a phone never fights the page's sideways scrolling.
 */
export function Knob({
  label,
  ariaLabel,
  value,
  min,
  max,
  step,
  format,
  onChange,
  onCommit,
  size = 54,
  bipolar = false,
}: {
  /** Short caption under the dial. */
  label: string;
  /** Full accessible name; several modules use the same short caption. */
  ariaLabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Shown under the knob and read out to assistive technology. */
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** Called once the gesture ends, so the caller can audition the new sound. */
  onCommit?: () => void;
  size?: number;
  /** Draw the arc from the centre rather than from the left, e.g. for panning. */
  bipolar?: boolean;
}) {
  const drag = useRef<{ y: number; from: number } | null>(null);
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const clamp = (next: number) =>
    Number(Math.min(max, Math.max(min, Math.round(next / step) * step)).toFixed(decimals));
  const fraction = (value - min) / (max - min);
  const angle = start + fraction * sweep;
  const radius = size / 2 - 5;
  const centre = size / 2;
  // Screen coordinates, y pointing down: 135° is bottom-left (minimum), 270° is straight
  // up, 405° is bottom-right (maximum) — the usual 270° knob sweep.
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return [centre + radius * Math.cos(radians), centre + radius * Math.sin(radians)];
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    if (Math.abs(to - from) < 0.01) return '';
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${
      Math.abs(to - from) > 180 ? 1 : 0
    } ${to > from ? 1 : 0} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const zero = bipolar ? start + sweep / 2 : start;
  const [px, py] = point(angle);

  return (
    <div className="knob">
      <div
        className="knob-dial"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel ?? label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        style={{ width: size, height: size }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, from: value };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          event.preventDefault();
          // 180 px of travel covers the full range; Shift gives a fine pass.
          const span = (max - min) / (event.shiftKey ? 720 : 180);
          onChange(clamp(drag.current.from + (drag.current.y - event.clientY) * span));
        }}
        onLostPointerCapture={() => {
          if (!drag.current) return;
          drag.current = null;
          onCommit?.();
        }}
        onDoubleClick={() => {
          onChange(clamp(bipolar ? (min + max) / 2 : min));
          onCommit?.();
        }}
        onKeyDown={(event) => {
          const jump = (max - min) / 10;
          const moves: Record<string, number> = {
            ArrowUp: step,
            ArrowRight: step,
            ArrowDown: -step,
            ArrowLeft: -step,
            PageUp: jump,
            PageDown: -jump,
          };
          if (event.key in moves) {
            event.preventDefault();
            onChange(clamp(value + moves[event.key]));
          } else if (event.key === 'Home') {
            event.preventDefault();
            onChange(min);
          } else if (event.key === 'End') {
            event.preventDefault();
            onChange(max);
          }
        }}
        onKeyUp={(event) => {
          if (
            [
              'ArrowUp',
              'ArrowRight',
              'ArrowDown',
              'ArrowLeft',
              'PageUp',
              'PageDown',
              'Home',
              'End',
            ].includes(event.key)
          )
            onCommit?.();
        }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <path className="knob-track" d={arc(start, start + sweep)} />
          <path className="knob-value" d={arc(Math.min(zero, angle), Math.max(zero, angle))} />
          <circle className="knob-cap" cx={centre} cy={centre} r={radius - 6} />
          <line
            className="knob-pointer"
            x1={centre}
            y1={centre}
            x2={px}
            y2={py}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="knob-label">{label}</span>
      <output className="knob-readout">{format(value)}</output>
    </div>
  );
}
