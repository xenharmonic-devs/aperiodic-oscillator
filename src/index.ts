import {allocateVoices} from './harmonic-allocator';

/**
 * The {@link AperiodicWave} interface defines an aperiodic waveform that can be used to shape the output of an {@link AperiodicOscillator}.
 */
export class AperiodicWave {
  detunings: number[];
  periodicWaves: PeriodicWave[];

  /**
   * Allocate voice detunings to approximate the given inharmonic spectrum.
   * @param context A [BaseAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext) representing the audio context you want the aperiodic wave to be associated with.
   * @param spectrum Partial ratios ordered by priority.
   * @param amplitudes Partial amplitudes.
   * @param maxNumberOfVoices Maximum number of voices to allocate.
   * @param tolerance Largest acceptable error in cents.
   */
  constructor(
    context: BaseAudioContext,
    spectrum: number[],
    amplitudes: number[],
    maxNumberOfVoices: number,
    tolerance: number
  ) {
    const [detunings, voiceAmplitudes] = allocateVoices(
      spectrum,
      amplitudes,
      maxNumberOfVoices,
      tolerance
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

/**
 * A collection of [OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode) instances acting like a single [OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode).
 */
export class MultiOscillator implements OscillatorNode {
  context: BaseAudioContext;
  voices: OscillatorNode[];
  private _options: OscillatorOptions;
  private _detune: ConstantSourceNode;
  private _frequency: ConstantSourceNode;
  protected _gain: GainNode;
  private _periodicWave?: PeriodicWave;
  private _started: boolean;
  private _startTime?: number;
  private _stopped: boolean;
  private _stopTime?: number;

  constructor(context: BaseAudioContext, options?: OscillatorOptions) {
    this.context = context;
    this._options = {...options, detune: 0, frequency: 0};
    const detune = new ConstantSourceNode(context, {
      offset: options?.detune ?? 0,
    });
    const frequency = new ConstantSourceNode(context, {
      offset: options?.frequency ?? 440,
    });
    const gain = context.createGain();

    const voice = new OscillatorNode(context, this._options);
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

  /**
   * Dispose of this {@link MultiOscillator} stopping and disconnecting all voices.
   */
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

  /**
   * Get the number of voices in this {@link MultiOscillator} group.
   */
  get numberOfVoices() {
    return this.voices.length;
  }

  /**
   * Set the number of voices in this {@link MultiOscillator} group.
   * Allocates and auto-connects new voices as necessary.
   */
  set numberOfVoices(newValue: number) {
    if (newValue < 1) {
      throw new Error('At least one voice must be present');
    }
    while (this.voices.length > newValue) {
      const voice = this.voices.pop()!;
      voice.stop();
      voice.disconnect();
    }
    while (this.voices.length < newValue) {
      const voice = new OscillatorNode(this.context, this._options);
      if (this.type === 'custom') {
        if (!this._periodicWave) {
          throw new Error("Periodic wave must be set when type = 'custom'");
        }
        voice.setPeriodicWave(this._periodicWave);
      } else {
        voice.type = this.type;
      }
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

  /**
   * An [a-rate](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam#a-rate) [AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam) representing detuning of oscillation in cents (though the `AudioParam` returned is read-only, the value it represents is not). The default value is 0.
   */
  get detune() {
    return this._detune.offset;
  }

  /**
   * An [a-rate](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam#a-rate) [AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam) representing the frequency of oscillation in hertz (though the AudioParam returned is read-only, the value it represents is not). The default value is 440 Hz (a standard middle-A note).
   */
  get frequency() {
    return this._frequency.offset;
  }

  /**
   * A string which specifies the shape of waveform to play; this can be one of a number of standard values, or `"custom"` to use a [PeriodicWave](https://developer.mozilla.org/en-US/docs/Web/API/PeriodicWave) to describe a custom waveform. Different waves will produce different tones. Standard values are `"sine"`, `"square"`, `"sawtooth"`, `"triangle"` and `"custom"`. The default is `"sine"`.
   */
  get type() {
    return this.voices[0].type;
  }

  /**
   * A string which specifies the shape of waveform to play; this can be one of a number of standard values, or `"custom"` to use a [PeriodicWave](https://developer.mozilla.org/en-US/docs/Web/API/PeriodicWave) to describe a custom waveform. Different waves will produce different tones. Standard values are `"sine"`, `"square"`, `"sawtooth"`, `"triangle"` and `"custom"`. The default is `"sine"`.
   */
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

  /**
   * Sets a [PeriodicWave](https://developer.mozilla.org/en-US/docs/Web/API/PeriodicWave) which describes a periodic waveform to be used instead of one of the standard waveforms; calling this sets the type to `"custom"`.
   * @param wave A [PeriodicWave](https://developer.mozilla.org/en-US/docs/Web/API/PeriodicWave) object representing the waveform to use as the shape of the oscillator's output.
   */
  setPeriodicWave(wave: PeriodicWave) {
    this._periodicWave = wave;
    for (const voice of this.voices) {
      voice.setPeriodicWave(wave);
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

  /**
   * Specifies the exact time to start playing the tone.
   * @param when The time, in seconds, at which the sound should begin to play. This value is specified in the same time coordinate system as the [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) is using for its [currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime) attribute. A value of 0 (or omitting the when parameter entirely) causes the sound to start playback immediately.
   */
  start(when?: number) {
    this._started = true;
    this._startTime = when;
    for (const voice of this.voices) {
      voice.start(when);
    }
    this._detune.start(when);
    this._frequency.start(when);
  }

  /**
   * Specifies the time to stop playing the tone.
   * @param when The time, in seconds, at which the sound should stop playing. This value is specified in the same time coordinate system as the [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) is using for its [currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime) attribute. Omitting this parameter, specifying a value of 0, or passing a negative value causes the sound to stop playback immediately.
   */
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

export interface UnisonOscillatorOptions extends OscillatorOptions {
  spread?: number;
  numberOfVoices?: number;
}

/**
 * A group of oscillators playing in unison slightly spread in frequency.
 */
export class UnisonOscillator extends MultiOscillator {
  private _spread: ConstantSourceNode;
  private _mus: GainNode[];

  constructor(context: BaseAudioContext, options?: UnisonOscillatorOptions) {
    super(context, options);
    const spread = new ConstantSourceNode(context, {
      offset: options?.spread ?? 0,
    });

    const voice = this.voices[0];
    const mu = new GainNode(context, {gain: 0});
    spread.connect(mu).connect(voice.frequency);
    voice.addEventListener('ended', () => {
      spread.disconnect(mu);
      mu.disconnect(voice.frequency);
    });

    this._spread = spread;
    this._mus = [mu];
    this.numberOfVoices = options?.numberOfVoices ?? 1;
  }

  set numberOfVoices(newValue: number) {
    super.numberOfVoices = newValue;

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

  /**
   * An [a-rate](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam#a-rate) [AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam) representing spread of oscillation in Hertz (though the `AudioParam` returned is read-only, the value it represents is not). The default value is 0.
   */
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

export interface AperiodicOscillatorOptions
  extends Omit<OscillatorOptions, 'type' | 'periodicWave'> {
  aperiodicWave?: AperiodicWave;
}

/**
 * Aperiodic oscillator with an inharmonic frequency spectrum.
 */
export class AperiodicOscillator extends MultiOscillator {
  constructor(context: BaseAudioContext, options?: AperiodicOscillatorOptions) {
    super(context, options);
    if (options?.aperiodicWave !== undefined) {
      this.setAperiodicWave(options.aperiodicWave);
    }
  }

  /**
   * Sets an {@link AperiodicWave} which describes an aperiodic waveform to be used.
   * @param wave An {@link AperiodicWave} object representing the waveform to use as the shape of the oscillator's output.
   */
  setAperiodicWave(wave: AperiodicWave) {
    const detunings = wave.detunings;
    this.numberOfVoices = detunings.length;
    for (let i = 0; i < detunings.length; ++i) {
      this.voices[i].detune.setValueAtTime(
        detunings[i],
        this.context.currentTime
      );
      this.voices[i].setPeriodicWave(wave.periodicWaves[i]);
    }
  }
}
