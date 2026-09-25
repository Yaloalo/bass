import { useEffect, useRef, useState } from 'react';
import { isNote, writtenPitch } from '../lib/music';
import { germanNoteName } from '../lib/i18n';
import type { MusicEvent } from '../lib/music';
import { instrumentProfile } from '../lib/instrument';
import { useStore } from '../lib/store';
import { Section } from './UI';
export function Score({
  events,
  meter = false,
  defaultOpen = true,
}: {
  events: MusicEvent[];
  meter?: boolean;
  /** Folded away where the notation is a reference rather than the point of the page. */
  defaultOpen?: boolean;
}) {
  const { instrument } = useStore();
  const profile = instrumentProfile(instrument);
  const staff = useRef<HTMLDivElement>(null),
    tab = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import('vexflow')
      .then((V) => {
        if (disposed || !staff.current || (instrument === 'guitar' && !tab.current)) return;
        const render = () => {
          if (disposed || !staff.current || (instrument === 'guitar' && !tab.current)) return;
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
            const targets =
              instrument === 'guitar'
                ? [
                    { container: tab.current!, type: 1 },
                    { container: staff.current!, type: 0 },
                  ]
                : [{ container: staff.current!, type: 0 }];
            targets.forEach(({ container, type }) => {
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
                        num_lines: profile.stringsHighToLow.length,
                        spacing_between_lines_px: 16,
                      });
                stave.addClef(type === 0 ? profile.notationClef : 'tab');
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
                          {
                            str:
                              profile.stringsHighToLow.findIndex((string) =>
                                event.stringId
                                  ? string.id === event.stringId
                                  : string.exerciseString === event.string,
                              ) + 1,
                            fret: event.fret,
                          },
                        ],
                        duration: event.duration,
                      },
                      false,
                    );
                  }
                  if (!isNote(event))
                    return new V.StaveNote({
                      keys: [profile.notationClef === 'bass' ? 'd/3' : 'b/4'],
                      duration: event.duration + 'r',
                      clef: profile.notationClef,
                    });
                  const p = writtenPitch(event);
                  const octave = p.octave + (instrument === 'guitar' ? 1 : 0);
                  const note = new V.StaveNote({
                    keys: [`${p.name.toLowerCase()}/${octave}`],
                    duration: event.duration,
                    clef: profile.notationClef,
                  });
                  const stateKey = p.name[0] + '/' + octave;
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
                  context.fillText(`TAKT ${index + 1}`, 16, y - 5);
                }
              });
              container.querySelector('svg')?.setAttribute('aria-hidden', 'true');
            });
          } catch (e) {
            console.error('VexFlow konnte die Notation nicht zeichnen:', e);
            setError('Die Notation konnte nicht gezeichnet werden. Lade die Seite neu.');
          }
        };
        render();
        observer = new ResizeObserver(render);
        observer.observe(staff.current);
      })
      .catch(() =>
        setError(
          'Notation konnte nicht geladen werden. Lade die Seite mit Internetverbindung erneut.',
        ),
      );
    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [events, instrument, meter, profile]);
  const text = events
    .map((n) =>
      isNote(n)
        ? `${germanNoteName(n.name ?? writtenPitch(n).name)}: ${profile.stringsHighToLow.find((string) => string.exerciseString === n.string)?.spokenLabel ?? n.string}-Saite Bund ${n.fret}, ${({ w: 'Ganze', h: 'Halbe', q: 'Viertel', '8': 'Achtel', '16': 'Sechzehntel' } as Record<string, string>)[n.duration] ?? n.duration}`
        : 'Pause',
    )
    .join('; ');
  return (
    <>
      <div className={`score-grid ${instrument === 'guitar' ? 'guitar-score-grid' : ''}`}>
        {instrument === 'guitar' && (
          <Section title="Gitarren-TAB" aside={profile.tuningLabel} defaultOpen={defaultOpen}>
            <div
              className="notation-scroll"
              ref={tab}
              role="img"
              aria-label={`Gitarren-TAB: ${text}`}
            />
            <p className="score-note">
              {meter
                ? 'Notenwerte und Pausen stehen zusätzlich in der Notation; TAB folgt demselben Rhythmus.'
                : 'Derselbe Fingersatz wie auf dem Griffbrett, von links nach rechts.'}
            </p>
          </Section>
        )}
        <Section
          title="Notation"
          aside={profile.notationClef === 'bass' ? 'Bassschlüssel' : 'Violinschlüssel'}
          defaultOpen={defaultOpen}
        >
          <div
            className="notation-scroll"
            ref={staff}
            role="img"
            aria-label={`Notation: ${text}`}
          />
          <p className="score-note">Eine Oktave über der klingenden Tonhöhe notiert.</p>
        </Section>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
