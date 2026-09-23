import { isNote, soundingMidi } from './music';
import type { MusicEvent } from './music';
let audio: AudioContext | undefined;
export async function audioContext() {
  audio ??= new AudioContext();
  if (audio.state === 'suspended') await audio.resume();
  return audio;
}
export function tone(
  context: AudioContext,
  midi: number,
  time: number,
  duration: number,
  click = false,
) {
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  oscillator.type = click ? 'sine' : 'triangle';
  oscillator.frequency.value = click ? midi : 440 * 2 ** ((midi - 69) / 12);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(click ? 0.2 : 0.24, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, time + Math.max(0.025, duration));
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.03);
  return oscillator;
}
let playing: OscillatorNode[] = [];
export function stopPlayback() {
  playing.forEach((n) => {
    try {
      n.stop();
    } catch {
      /* Already finished. */
    }
  });
  playing = [];
}
/**
 * `startAt` is a time on the shared AudioContext clock, which the drum transport uses
 * too — passing the next downbeat is what makes the example land with the groove
 * instead of wherever the button happened to be pressed.
 */
export async function playEvents(events: MusicEvent[], bpm: number, startAt?: number) {
  stopPlayback();
  const ctx = await audioContext();
  let t = Math.max(ctx.currentTime + 0.04, startAt ?? 0);
  events.forEach((event) => {
    const beat =
      event.duration === '8'
        ? 0.5
        : event.duration === '16'
          ? 0.25
          : event.duration === 'h'
            ? 2
            : event.duration === 'w'
              ? 4
              : 1;
    const length = (60 / bpm) * beat;
    if (isNote(event)) playing.push(tone(ctx, soundingMidi(event), t, length * 0.87));
    t += length;
  });
  return (t - ctx.currentTime) * 1000;
}
