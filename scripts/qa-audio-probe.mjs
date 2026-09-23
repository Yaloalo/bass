// Observe real Web Audio calls without replacing the browser's audio clock or synthesis.
// Installed only in an isolated QA browser context, never in the shipped application.
export async function installAudioProbe(context) {
  await context.addInitScript(() => {
    const sources = [];
    window.__bassAudioProbe = sources;
    for (const [kind, prototype] of [
      ['oscillator', OscillatorNode.prototype],
      ['buffer', AudioBufferSourceNode.prototype],
    ]) {
      const start = prototype.start;
      const stop = prototype.stop;
      const records = new WeakMap();
      prototype.start = function (...args) {
        // The waveform display renders the same graph through an OfflineAudioContext.
        // Nothing there reaches the speakers, so it is not playback and is not recorded.
        if (
          typeof OfflineAudioContext !== 'undefined' &&
          this.context instanceof OfflineAudioContext
        )
          return Reflect.apply(start, this, args);
        window.__bassAudioContext = this.context;
        const record = {
          kind,
          at: args[0] ?? 0,
          clock: this.context.currentTime,
          stop: null,
          frequency: kind === 'oscillator' ? this.frequency.value : null,
        };
        records.set(this, record);
        sources.push(record);
        return Reflect.apply(start, this, args);
      };
      prototype.stop = function (...args) {
        const record = records.get(this);
        if (record) record.stop = args[0] ?? this.context.currentTime;
        return Reflect.apply(stop, this, args);
      };
    }
  });
}

export async function audioEvents(page) {
  return page.evaluate(() => window.__bassAudioProbe);
}
