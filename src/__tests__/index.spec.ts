/* eslint-disable @typescript-eslint/no-unused-vars */
import {beforeEach, describe, it, expect, vi} from 'vitest';
import {
  AperiodicOscillator,
  AperiodicWave,
  MultiOscillator,
  UnisonOscillator,
} from '../';

class MockAudioNode {
  constructor(context: MockAudioContext) {}

  connect(destinationNode: AudioNode) {
    return destinationNode;
  }

  disconnect() {}

  start(when?: number) {}

  stop(when?: number) {}
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
  frequency: MockAudioParam;
  private started = false;
  private endedListeners: (() => void)[] = [];

  static stopCalls = 0;
  static resetCounters() {
    MockOscillatorNode.stopCalls = 0;
  }

  constructor(context: MockAudioContext) {
    super(context);
    this.detune = new MockAudioParam();
    this.frequency = new MockAudioParam();
  }

  setPeriodicWave(wave: PeriodicWave) {}

  addEventListener(type: 'ended', listener: () => void) {
    this.endedListeners.push(listener);
  }

  start(when?: number) {
    this.started = true;
  }

  stop(when?: number) {
    MockOscillatorNode.stopCalls += 1;
    if (!this.started) {
      const invalidStateError = new Error(
        'Cannot call stop before start: InvalidStateError',
      );
      invalidStateError.name = 'InvalidStateError';
      throw invalidStateError;
    }
    for (const listener of this.endedListeners) {
      listener();
    }
  }
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

beforeEach(() => {
  MockOscillatorNode.resetCounters();
});

describe('MultiOscillator lifecycle', () => {
  it('Can reduce voices before start without stopping unstarted voices', () => {
    const oscillator = new MultiOscillator(context, {frequency: 440});
    oscillator.numberOfVoices = 3;

    expect(() => {
      oscillator.numberOfVoices = 1;
    }).not.toThrow();
    expect(MockOscillatorNode.stopCalls).toBe(0);
  });

  it('Can dispose before start without stopping unstarted voices', () => {
    const oscillator = new MultiOscillator(context, {frequency: 440});
    oscillator.numberOfVoices = 2;

    expect(() => {
      oscillator.dispose();
    }).not.toThrow();
    expect(MockOscillatorNode.stopCalls).toBe(0);
  });
});

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
  it('throws when spectrum and amplitudes lengths differ', () => {
    expect(() => new AperiodicWave(context, [1, 2], [1], 2, 0.1)).toThrow(
      /amplitudes\.length \(1\) must equal spectrum\.length \(2\)/,
    );
  });

  it('throws for invalid numeric constructor inputs', () => {
    expect(() => new AperiodicWave(context, [1], [1], 0, 0.1)).toThrow(
      /maxNumberOfVoices/,
    );
    expect(() => new AperiodicWave(context, [1], [1], 1, -0.1)).toThrow(
      /tolerance/,
    );
    expect(() => new AperiodicWave(context, [0], [1], 1, 0.1)).toThrow(
      /spectrum/,
    );
    expect(() => new AperiodicWave(context, [1], [-1], 1, 0.1)).toThrow(
      /amplitudes/,
    );
  });

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
      tolerance,
    );

    const oscillator = new AperiodicOscillator(context, {aperiodicWave});
    expect(oscillator.voices).toHaveLength(7);
  });
});
