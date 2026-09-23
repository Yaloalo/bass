import { useCallback, useEffect, useRef, useState } from 'react';
import { PianoInstrument } from './piano-audio';

/**
 * One piano voice with its held-key bookkeeping. The full piano page and the compact
 * keyboards embedded in the scale and chord pages share this, so an embedded keyboard
 * plays exactly like the real one instead of being a picture of it.
 */
export function usePiano(volume = 55) {
  const [held, setHeld] = useState<Map<string, number>>(new Map());
  const [audioError, setAudioError] = useState('');
  const instrument = useRef<PianoInstrument | null>(null);

  useEffect(() => {
    const piano = new PianoInstrument();
    instrument.current = piano;
    const silence = () => {
      piano.stopAll();
      setHeld(new Map());
    };
    const visibility = () => {
      if (document.hidden) silence();
    };
    window.addEventListener('blur', silence);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', silence);
      document.removeEventListener('visibilitychange', visibility);
      piano.dispose();
      instrument.current = null;
    };
  }, []);

  useEffect(() => {
    instrument.current?.setVolume(volume / 100);
  }, [volume]);

  const report = useCallback((task: Promise<void> | undefined) => {
    setAudioError('');
    void task?.catch(() =>
      setAudioError(
        'Der Ton konnte nicht starten. Prüfe die Audiofreigabe des Browsers und versuche es erneut.',
      ),
    );
  }, []);

  const start = useCallback(
    (midi: number, key: string) => {
      setHeld((old) => new Map(old).set(key, midi));
      report(instrument.current?.noteOn(key, midi));
    },
    [report],
  );

  const end = useCallback((key: string) => {
    instrument.current?.noteOff(key);
    setHeld((old) => {
      const next = new Map(old);
      next.delete(key);
      return next;
    });
  }, []);

  const playChord = useCallback(
    (midis: number[]) => report(instrument.current?.playChord(midis)),
    [report],
  );

  const stopAll = useCallback(() => {
    instrument.current?.stopAll();
    setHeld(new Map());
  }, []);

  return { held, start, end, playChord, stopAll, audioError, setAudioError };
}
