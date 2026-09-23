import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';

/** Keep incomplete typed numbers local, so typing 96 never clamps the initial 9 to 30. */
export function TempoInput({ label }: { label: string }) {
  const { bpm, setBpm } = useStore();
  const [draft, setDraft] = useState(String(bpm));
  useEffect(() => setDraft(String(bpm)), [bpm]);
  const commit = () => {
    const value = Math.max(30, Math.min(240, Math.round(Number(draft)) || bpm));
    setBpm(value);
    setDraft(String(value));
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={30}
      max={240}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const value = Number(event.target.value);
        if (value >= 30 && value <= 240 && Number.isInteger(value)) setBpm(value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
