import { audioContext } from './audio';
import { midiFrequency, selectedPitches } from './piano';

interface Voice {
  release: (at?: number) => void;
  stop: () => void;
}

/** A small, independent instrument. It never stops the rhythm or reference player. */
export class PianoInstrument {
  private context: AudioContext | undefined;
  private output: GainNode | undefined;
  private compressor: DynamicsCompressorNode | undefined;
  private voices = new Map<string, Voice>();
  private requests = new Map<string, { released: boolean }>();
  private generation = 0;
  private chordGeneration = 0;
  private volume = 0.55;
  private disposed = false;

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.output) {
      this.output.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.015);
    }
  }

  private async prepare() {
    const context = await audioContext();
    if (this.disposed) return undefined;
    if (!this.output) {
      this.context = context;
      this.output = context.createGain();
      this.output.gain.value = this.volume;
      this.compressor = context.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.15;
      this.compressor.connect(this.output);
      this.output.connect(context.destination);
    }
    return context;
  }

  private startVoice(key: string, midi: number, time: number): Voice {
    const context = this.context!;
    this.voices.get(key)?.stop();
    // The keyboard has 25 notes. Leave room for a few held notes while replaying
    // a chord, with a strict ceiling on simultaneous oscillator groups.
    if (this.voices.size >= 32) {
      const oldest = this.voices.entries().next().value;
      if (oldest) {
        oldest[1].stop();
        this.voices.delete(oldest[0]);
      }
    }
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(0.16, time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.055, time + 0.18);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 4);
    // Keep release independent of the sound's decay. Some Web Audio engines do
    // not implement cancelAndHoldAtTime; cancelling the decay curve instead can
    // throw on the first note and prevent the rest of a chord from starting.
    const releaseGain = context.createGain();
    releaseGain.gain.value = 1;
    envelope.connect(releaseGain);
    releaseGain.connect(this.compressor!);
    const oscillators: OscillatorNode[] = [];
    let ended = 0;
    let released = false;

    const voice: Voice = {
      release: (at = context.currentTime) => {
        if (released) return;
        released = true;
        // Even a quick tap has enough attack to be audible after context resume.
        const releaseTime = Math.max(time + 0.1, at);
        releaseGain.gain.setValueAtTime(1, releaseTime);
        releaseGain.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.16);
        oscillators.forEach((oscillator) => oscillator.stop(releaseTime + 0.18));
      },
      stop: () => {
        oscillators.forEach((oscillator) => {
          try {
            oscillator.stop();
          } catch {
            /* An ended oscillator needs no further stop. */
          }
        });
      },
    };

    for (const [harmonic, level] of [
      [1, 0.78],
      [2, 0.17],
      [3, 0.05],
    ]) {
      const oscillator = context.createOscillator();
      const partial = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = midiFrequency(midi) * harmonic;
      partial.gain.value = level;
      oscillator.connect(partial);
      partial.connect(envelope);
      oscillator.onended = () => {
        oscillator.disconnect();
        partial.disconnect();
        ended++;
        if (ended === 3) {
          envelope.disconnect();
          releaseGain.disconnect();
          if (this.voices.get(key) === voice) {
            this.voices.delete(key);
            this.requests.delete(key);
          }
        }
      };
      oscillator.start(time);
      oscillator.stop(time + 4.05);
      oscillators.push(oscillator);
    }
    this.voices.set(key, voice);
    return voice;
  }

  async noteOn(key: string, midi: number) {
    if (this.disposed || !Number.isInteger(midi) || midi < 0 || midi > 127) return;
    const request = { released: false };
    this.requests.set(key, request);
    const generation = this.generation;
    const context = await this.prepare();
    if (!context || generation !== this.generation || this.requests.get(key) !== request) return;
    const voice = this.startVoice(key, midi, context.currentTime + 0.005);
    if (request.released) voice.release();
  }

  noteOff(key: string) {
    const request = this.requests.get(key);
    if (request) request.released = true;
    this.voices.get(key)?.release();
  }

  async playChord(midis: readonly number[]) {
    const generation = this.generation;
    const chord = ++this.chordGeneration;
    for (const [key, voice] of this.voices) {
      if (key.startsWith('chord-')) voice.stop();
    }
    const context = await this.prepare();
    if (!context || generation !== this.generation || chord !== this.chordGeneration) return;
    const time = context.currentTime + 0.015;
    selectedPitches(midis)
      .slice(0, 25)
      .forEach((midi) => {
        this.startVoice(`chord-${chord}-${midi}`, midi, time).release(time + 1.1);
      });
  }

  stopAll() {
    this.generation++;
    this.chordGeneration++;
    this.requests.clear();
    this.voices.forEach((voice) => voice.stop());
    this.voices.clear();
  }

  dispose() {
    this.disposed = true;
    this.stopAll();
    this.compressor?.disconnect();
    this.output?.disconnect();
  }
}
