import {allocateVoices} from './harmonic-allocator';

export class AperiodicWave {
  detunings: number[];
  periodicWaves: PeriodicWave[];

  constructor(
    context: BaseAudioContext,
    spectrum: number[],
    amplitudes: number[],
    maxVoices: number,
    jnd: number
  ) {
    const [detunings, voiceAmplitudes] = allocateVoices(
      spectrum,
      amplitudes,
      maxVoices,
      jnd
    );

    this.detunings = detunings;
    this.periodicWaves = [];
    for (const voiceAmplitude of voiceAmplitudes) {
      const periodicWave = context.createPeriodicWave(
        voiceAmplitude.map(() => 0),
        voiceAmplitude,
        {disableNormalization: true}
      );
      this.periodicWaves.push(periodicWave);
    }
  }
}

class MultiOscillator implements OscillatorNode {
  context: BaseAudioContext;
  voices: OscillatorNode[];
  _detune: ConstantSourceNode;
  _frequency: ConstantSourceNode;
  _gain: GainNode;
  _periodicWave?: PeriodicWave;
  _started: boolean;
  _startTime?: number;
  _stopped: boolean;
  _stopTime?: number;

  constructor(context: BaseAudioContext) {
    this.context = context;
    const detune = context.createConstantSource();
    detune.offset.setValueAtTime(0, context.currentTime);
    const frequency = context.createConstantSource();
    frequency.offset.setValueAtTime(440, context.currentTime);
    const gain = context.createGain();

    const voice = this.context.createOscillator();
    voice.frequency.setValueAtTime(0, this.context.currentTime);
    voice.connect(gain);
    detune.connect(voice.detune);
    frequency.connect(voice.frequency);
    voice.addEventListener('ended', () => {
      voice.disconnect(gain);
      detune.disconnect(voice.detune);
      frequency.disconnect(voice.frequency);
    });

    this.voices = [voice];

    this._detune = detune;
    this._frequency = frequency;
    this._gain = gain;

    this._started = false;
    this._stopped = false;
  }

  dispose() {
    for (const voice of this.voices) {
      voice.stop();
      voice.disconnect();
    }
    this._detune.stop();
    this._detune.disconnect();
    this._frequency.stop();
    this._frequency.disconnect();
    this._gain.disconnect();
  }

  get numVoices() {
    return this.voices.length;
  }

  set numVoices(newValue: number) {
    if (newValue < 1) {
      throw new Error('At least one voice must be present');
    }
    while (this.voices.length > newValue) {
      const voice = this.voices.pop()!;
      voice.stop();
      voice.disconnect();
    }
    while (this.voices.length < newValue) {
      const voice = this.context.createOscillator();
      if (this.type === 'custom') {
        if (!this._periodicWave) {
          throw new Error("Periodic wave must be set when type = 'custom'");
        }
        voice.setPeriodicWave(this._periodicWave);
      } else {
        voice.type = this.type;
      }
      voice.frequency.setValueAtTime(0, this.context.currentTime);
      voice.connect(this._gain);
      this._detune.connect(voice.detune);
      this._frequency.connect(voice.frequency);
      voice.addEventListener('ended', () => {
        voice.disconnect(this._gain);
        this._detune.disconnect(voice.detune);
        this._frequency.disconnect(voice.frequency);
      });
      if (this._started) {
        voice.start(this._startTime);
        if (this._stopped) {
          voice.stop(this._stopTime);
        }
      }
      this.voices.push(voice);
    }
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
    this._periodicWave = periodicWave;
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
    this._started = true;
    this._startTime = when;
    for (const voice of this.voices) {
      voice.start(when);
    }
    this._detune.start(when);
    this._frequency.start(when);
  }

  stop(when?: number) {
    this._stopped = true;
    this._stopTime = when;
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

export class UnisonOscillator extends MultiOscillator {
  _spread: ConstantSourceNode;
  _mus: GainNode[];

  constructor(context: BaseAudioContext) {
    super(context);
    const spread = context.createConstantSource();
    spread.offset.setValueAtTime(0, context.currentTime);

    const voice = this.voices[0];
    const mu = this.context.createGain();
    mu.gain.setValueAtTime(0, this.context.currentTime);
    spread.connect(mu).connect(voice.frequency);
    voice.addEventListener('ended', () => {
      spread.disconnect(mu);
      mu.disconnect(voice.frequency);
    });

    this._spread = spread;
    this._mus = [mu];
  }

  set numVoices(newValue: number) {
    super.numVoices = newValue;

    while (this._mus.length > newValue) {
      this._mus.pop()!.disconnect();
    }
    while (this._mus.length < newValue) {
      const voice = this.voices[this._mus.length];
      const mu = this.context.createGain();
      this._spread.connect(mu).connect(voice.frequency);
      voice.addEventListener('ended', () => {
        this._spread.disconnect(mu);
        mu.disconnect(voice.frequency);
      });
      this._mus.push(mu);
    }

    this._gain.gain.setValueAtTime(
      1 / Math.sqrt(newValue),
      this.context.currentTime
    );

    // Special handling for the degenerate case.
    if (newValue === 1) {
      this._mus[0].gain.setValueAtTime(0, this.context.currentTime);
      return;
    }

    for (let i = 0; i < newValue; ++i) {
      const gain = (2 * i) / (newValue - 1) - 1;
      this._mus[i].gain.setValueAtTime(gain, this.context.currentTime);
    }
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
  setAperiodicWave(aperiodicWave: AperiodicWave) {
    const detunings = aperiodicWave.detunings;
    this.numVoices = detunings.length;
    for (let i = 0; i < detunings.length; ++i) {
      this.voices[i].detune.setValueAtTime(
        detunings[i],
        this.context.currentTime
      );
      this.voices[i].setPeriodicWave(aperiodicWave.periodicWaves[i]);
    }
  }
}
