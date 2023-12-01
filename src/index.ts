import {allocateVoices} from './harmonic-allocator';

class MultiOscillator implements OscillatorNode {
  context: AudioContext;
  voices: OscillatorNode[];
  _detune: ConstantSourceNode;
  _frequency: ConstantSourceNode;
  _gain: GainNode;

  constructor(context: AudioContext, numVoices: number) {
    this.context = context;
    const detune = context.createConstantSource();
    detune.offset.setValueAtTime(0, context.currentTime);
    const frequency = context.createConstantSource();
    frequency.offset.setValueAtTime(440, context.currentTime);
    const gain = context.createGain();

    this.voices = [];
    for (let i = 0; i < numVoices; ++i) {
      const voice = context.createOscillator();
      voice.frequency.setValueAtTime(0, context.currentTime);
      voice.connect(gain);
      detune.connect(voice.detune);
      frequency.connect(voice.frequency);
      voice.addEventListener('ended', () => {
        voice.disconnect(gain);
        detune.disconnect(voice.detune);
        frequency.disconnect(voice.frequency);
      });
      this.voices.push(voice);
    }
    this._detune = detune;
    this._frequency = frequency;
    this._gain = gain;
  }

  get detune() {
    return this._detune.offset;
  }

  get frequency() {
    return this._frequency.offset;
  }

  get type() {
    return this.voices[0].type;
  }

  set type(newValue: OscillatorType) {
    for (const voice of this.voices) {
      voice.type = newValue;
    }
  }

  get onended() {
    return this.voices[0].onended;
  }

  get channelCount() {
    return this.voices[0].channelCount;
  }

  get channelInterpretation() {
    return this.voices[0].channelInterpretation;
  }

  get channelCountMode() {
    return this.voices[0].channelCountMode;
  }

  get numberOfInputs() {
    return this.voices[0].numberOfInputs;
  }

  get numberOfOutputs() {
    return this.voices[0].numberOfOutputs;
  }

  setPeriodicWave(periodicWave: PeriodicWave) {
    for (const voice of this.voices) {
      voice.setPeriodicWave(periodicWave);
    }
  }

  addEventListener<K extends 'ended'>(
    type: K,
    listener: (
      this: OscillatorNode,
      ev: AudioScheduledSourceNodeEventMap[K]
    ) => any,
    options?: boolean | AddEventListenerOptions | undefined
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined
  ): void;
  addEventListener(type: unknown, listener: unknown, options?: unknown): void {
    this.voices[0].addEventListener(
      type as any,
      listener as any,
      options as any
    );
  }

  removeEventListener<K extends 'ended'>(
    type: K,
    listener: (
      this: OscillatorNode,
      ev: AudioScheduledSourceNodeEventMap[K]
    ) => any,
    options?: boolean | EventListenerOptions | undefined
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions | undefined
  ): void;
  removeEventListener(
    type: unknown,
    listener: unknown,
    options?: unknown
  ): void {
    this.voices[0].removeEventListener(
      type as any,
      listener as any,
      options as any
    );
  }

  start(when?: number) {
    for (const voice of this.voices) {
      voice.start(when);
    }
    this._detune.start(when);
    this._frequency.start(when);
  }

  stop(when?: number) {
    for (const voice of this.voices) {
      voice.stop(when);
    }
    this._detune.stop(when);
    this._frequency.stop(when);
  }

  connect(
    destinationNode: AudioNode,
    output?: number | undefined,
    input?: number | undefined
  ): AudioNode;
  connect(destinationParam: AudioParam, output?: number | undefined): void;
  connect(
    destinationNode: unknown,
    output?: unknown,
    input?: unknown
  ): void | AudioNode {
    return this._gain.connect(
      destinationNode as any,
      output as any,
      input as any
    );
  }

  disconnect(): void;
  disconnect(output: number): void;
  disconnect(destinationNode: AudioNode): void;
  disconnect(destinationNode: AudioNode, output: number): void;
  disconnect(destinationNode: AudioNode, output: number, input: number): void;
  disconnect(destinationParam: AudioParam): void;
  disconnect(destinationParam: AudioParam, output: number): void;
  disconnect(
    destinationNode?: unknown,
    output?: unknown,
    input?: unknown
  ): void {
    if (destinationNode === undefined) {
      this._gain.disconnect();
    } else {
      this._gain.disconnect(
        destinationNode as any,
        output as any,
        input as any
      );
    }
  }

  dispatchEvent(event: Event): boolean {
    for (const voice of this.voices) {
      voice.dispatchEvent(event);
    }
    this._detune.dispatchEvent(event);
    this._frequency.dispatchEvent(event);
    return this._gain.dispatchEvent(event);
  }
}

// TODO: Frequency-space variant
export class UnisonOscillator extends MultiOscillator {
  _spread: ConstantSourceNode;
  _mus: GainNode[];

  constructor(context: AudioContext, numVoices: number) {
    super(context, numVoices);
    this._gain.gain.setValueAtTime(
      1 / Math.sqrt(numVoices),
      context.currentTime
    );
    const spread = context.createConstantSource();
    this._mus = [];
    for (let i = 0; i < numVoices; ++i) {
      const mu = context.createGain();
      mu.gain.setValueAtTime(
        (2 * i) / (numVoices - 1) - 1,
        context.currentTime
      );
      const voice = this.voices[i];
      spread.connect(mu).connect(voice.detune);
      voice.addEventListener('ended', () => {
        spread.disconnect(mu);
        mu.disconnect(voice.detune);
      });
      this._mus.push(mu);
    }
    this._spread = spread;
  }

  get spread() {
    return this._spread.offset;
  }

  start(when?: number) {
    super.start(when);
    this._spread.start(when);
  }

  stop(when?: number) {
    super.stop(when);
    this._spread.stop(when);
  }

  dispatchEvent(event: Event): boolean {
    this._spread.dispatchEvent(event);
    for (const mu of this._mus) {
      mu.dispatchEvent(event);
    }
    return super.dispatchEvent(event);
  }
}

export class AperiodicOscillator extends MultiOscillator {
  constructor(context: AudioContext, numVoices: number) {
    super(context, numVoices);
  }

  setAperiodicWave(spectrum: number[], amplitudes: number[], jnd = 0.5) {
    const [detunings, voiceAmplitudes] = allocateVoices(
      spectrum,
      amplitudes,
      this.voices.length,
      jnd
    );
    for (let i = 0; i < detunings.length; ++i) {
      this.voices[i].detune.setValueAtTime(
        detunings[i],
        this.context.currentTime
      );
      const wave = this.context.createPeriodicWave(
        voiceAmplitudes[i].map(() => 0),
        voiceAmplitudes[i],
        {disableNormalization: true}
      );
      this.voices[i].setPeriodicWave(wave);
    }
    // Silence unused voices
    const silence = this.context.createPeriodicWave(
      new Float32Array([0, 0]),
      new Float32Array([0, 0]),
      {disableNormalization: true}
    );
    for (let i = detunings.length; i < this.voices.length; ++i) {
      this.voices[i].setPeriodicWave(silence);
    }
  }
}
