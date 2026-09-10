import { useEffect, useRef, useState } from 'react';
import { isNote, writtenPitch, pretty } from '../lib/music';
import type { MusicEvent } from '../lib/music';
import { Panel } from './UI';
export function Score({ events, meter = false }: { events: MusicEvent[]; meter?: boolean }) {
  const staff = useRef<HTMLDivElement>(null),
    tab = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import('vexflow')
      .then((V) => {
        if (disposed || !staff.current || !tab.current) return;
        const render = () => {
          if (disposed || !staff.current || !tab.current) return;
          try {
            setError('');
            const bars: MusicEvent[][] = [];
            let group: MusicEvent[] = [];
            let beats = 0;
            for (const event of events) {
              group.push(event);
              beats +=
                event.duration === '8'
                  ? 0.5
                  : event.duration === '16'
                    ? 0.25
                    : event.duration === 'h'
                      ? 2
                      : event.duration === 'w'
                        ? 4
                        : 1;
              if (meter && beats >= 4) {
                bars.push(group);
                group = [];
                beats = 0;
              }
            }
            if (group.length) bars.push(group);
            [staff.current, tab.current].forEach((container, type) => {
              container.replaceChildren();
              const available = Math.max(350, container.clientWidth);
              const width = Math.max(
                available,
                Math.min(900, 120 + Math.max(...bars.map((b) => b.length)) * 52),
              );
              const renderer = new V.Renderer(container, V.Renderer.Backends.SVG);
              renderer.resize(width, 170 * bars.length);
              const context = renderer.getContext();
              context.setFillStyle('#1d2733');
              context.setStrokeStyle('#1d2733');
              bars.forEach((bar, index) => {
                const y = index * 170 + 22;
                const stave =
                  type === 0
                    ? new V.Stave(10, y, width - 20)
                    : new V.TabStave(10, y, width - 20, {
                        num_lines: 4,
                        spacing_between_lines_px: 16,
                      });
                stave.addClef(type === 0 ? 'bass' : 'tab');
                if (meter && type === 0) stave.addTimeSignature('4/4');
                stave.setContext(context).draw();
                const accidentalState = new Map<string, string>();
                const tickables = bar.map((event) => {
                  if (type === 1) {
                    if (!isNote(event)) {
                      const rest = new V.GhostNote({ duration: event.duration });
                      return rest;
                    }
                    return new V.TabNote(
                      {
                        positions: [
                          { str: { G: 1, D: 2, A: 3, E: 4 }[event.string], fret: event.fret },
                        ],
                        duration: event.duration,
                      },
                      false,
                    );
                  }
                  if (!isNote(event))
                    return new V.StaveNote({
                      keys: ['d/3'],
                      duration: event.duration + 'r',
                      clef: 'bass',
                    });
                  const p = writtenPitch(event);
                  const note = new V.StaveNote({
                    keys: [p.key],
                    duration: event.duration,
                    clef: 'bass',
                  });
                  const stateKey = p.name[0] + '/' + p.octave;
                  const previous = accidentalState.get(stateKey) ?? '';
                  if (previous !== p.accidental)
                    note.addModifier(new V.Accidental(p.accidental || 'n'), 0);
                  accidentalState.set(stateKey, p.accidental);
                  return note;
                });
                const voice = new V.Voice({ num_beats: 4, beat_value: 4 })
                  .setMode(V.Voice.Mode.SOFT)
                  .addTickables(tickables);
                new V.Formatter()
                  .joinVoices([voice])
                  .format([voice], width - (type === 0 ? 110 : 80));
                voice.draw(context, stave);
                if (meter) {
                  context.setFont('Arial', 11, '');
                  context.fillText(`BAR ${index + 1}`, 16, y - 5);
                }
              });
              container.querySelector('svg')?.setAttribute('aria-hidden', 'true');
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to render notation');
          }
        };
        render();
        observer = new ResizeObserver(render);
        observer.observe(staff.current);
      })
      .catch(() =>
        setError(
          'Notation could not load. Reload this page when connected to finish caching the app.',
        ),
      );
    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [events, meter]);
  const text = events
    .map((n) =>
      isNote(n)
        ? `${pretty(n.name ?? writtenPitch(n).name)}: ${n.string} string fret ${n.fret}, ${n.duration === '8' ? 'eighth' : 'quarter'} note`
        : 'rest',
    )
    .join('; ');
  return (
    <>
      <div className="score-grid">
        <Panel title="Standard notation" aside={<span className="small-label">BASS CLEF</span>}>
          <div
            className="notation-scroll"
            ref={staff}
            role="img"
            aria-label={`Standard notation: ${text}`}
          />
          <p className="score-note">Written one octave above sounding pitch.</p>
        </Panel>
        <Panel title="Bass TAB" aside={<span className="small-label">E · A · D · G</span>}>
          <div className="notation-scroll" ref={tab} role="img" aria-label={`Bass TAB: ${text}`} />
          <p className="score-note">
            {meter
              ? 'Read durations and rests from the staff; TAB spacing follows the same rhythm.'
              : 'Same ascending route as the fretboard, from left to right.'}
          </p>
        </Panel>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
