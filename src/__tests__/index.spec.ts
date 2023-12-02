/* eslint-disable @typescript-eslint/no-unused-vars */
import {describe, it, expect, vi} from 'vitest';
import {AperiodicOscillator, AperiodicWave, UnisonOscillator} from '../';

class MockAudioNode {
  constructor(context: MockAudioContext) {}

  connect(destinationNode: AudioNode) {
    return destinationNode;
  }
}

class MockAudioParam {
  value: number;
  setValueAtTime(value: number, startTime: number) {
    this.value = value;
    return this;
  }
}

class MockConstantSourceNode extends MockAudioNode {
  offset: MockAudioParam;

  constructor(context: MockAudioContext, options: ConstantSourceOptions) {
    super(context);
    this.offset = new MockAudioParam();
    this.offset.setValueAtTime(options?.offset ?? 1, context.currentTime);
  }
}

class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  detune: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.detune = new MockAudioParam();
  }

  setPeriodicWave(wave: PeriodicWave) {}

  addEventListener(type: 'ended', listener: () => void) {}
}

class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.gain = new MockAudioParam();
  }
}

class MockAudioContext {
  currentTime = 0;
  createGain(): MockGainNode {
    return new MockGainNode(this);
  }
  createPeriodicWave() {}
}

vi.stubGlobal('ConstantSourceNode', MockConstantSourceNode);
vi.stubGlobal('OscillatorNode', MockOscillatorNode);
vi.stubGlobal('GainNode', MockGainNode);

const context = new MockAudioContext() as unknown as AudioContext;

describe('Unison Oscillator', () => {
  it('Allocates voices on intialization (default)', () => {
    const oscillator = new UnisonOscillator(context);
    expect(oscillator.voices).toHaveLength(1);
  });

  it('Allocates voices on intialization', () => {
    const oscillator = new UnisonOscillator(context, {numberOfVoices: 3});
    expect(oscillator.voices).toHaveLength(3);
  });

  it('Applies spread on initialization', () => {
    const oscillator = new UnisonOscillator(context, {
      numberOfVoices: 4,
      spread: 5,
    });
    expect(oscillator.voices).toHaveLength(4);
    expect(oscillator.spread.value).toBe(5);
  });
});

describe('Aperiodic Oscillator', () => {
  it('Allocates voices on intialization', () => {
    const ns = [...Array(129).keys()];
    ns.shift();
    const spectrum = ns.map(n => n ** 1.5);
    const amplitudes = ns.map(n => 0.3 * n ** -1.5);
    const maxNumberOfVoices = 7;
    const tolerance = 0.1; // In cents
    const aperiodicWave = new AperiodicWave(
      context,
      spectrum,
      amplitudes,
      maxNumberOfVoices,
      tolerance
    );

    const oscillator = new AperiodicOscillator(context, {aperiodicWave});
    expect(oscillator.voices).toHaveLength(7);
  });
});
