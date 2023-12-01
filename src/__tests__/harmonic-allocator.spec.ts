import {describe, it, expect} from 'vitest';
import {allocateVoices, centsError} from '../harmonic-allocator';

function centsToValue(c: number) {
  return 2 ** (c / 1200);
}

describe('Harmonic allocator', () => {
  it('easily allocates harmonics', () => {
    const [detunings, voiceAmplitudes] = allocateVoices(
      [1, 2, 3, 4, 5],
      [10, 9, 8, 7, 6],
      10,
      0.5
    );
    expect(detunings).toEqual([0]);
    expect(voiceAmplitudes[0]).toEqual(new Float32Array([0, 10, 9, 8, 7, 6]));
  });

  it('allocates a mean golden spectrum', () => {
    const phi = Math.sqrt((Math.sqrt(5) + 1) / 2);
    const spectrum = [...Array(20).keys()].map(i => phi ** i);
    const amplitudes = [...Array(20).keys()].map(i => phi ** -i);
    const jnd = 0.5;
    const [detunings, voiceAmplitudes] = allocateVoices(
      spectrum,
      amplitudes,
      9,
      jnd
    );
    let numFound = 0;
    let numNonZero = 0;
    for (let i = 0; i < detunings.length; ++i) {
      const ratio = centsToValue(detunings[i]);
      for (let j = 0; j < voiceAmplitudes[i].length; ++j) {
        const amplitude = voiceAmplitudes[i][j];
        if (amplitude) {
          numNonZero++;
        }
        for (let k = 0; k < spectrum.length; ++k) {
          if (centsError(ratio * j, spectrum[k]) < jnd) {
            if (amplitude) {
              expect(amplitude).toBeCloseTo(amplitudes[k]);
              numFound++;
            }
            break;
          }
        }
      }
    }
    expect(numFound).toBe(20);
    expect(numNonZero).toBe(20);
  });

  it('does a good job with limited resources on the mean golden spectrum', () => {
    const phi = Math.sqrt((Math.sqrt(5) + 1) / 2);
    const spectrum = [...Array(20).keys()].map(i => phi ** i);
    const amplitudes = [...Array(20).keys()].map(i => phi ** -i);
    const [detunings, voiceAmplitudes] = allocateVoices(
      spectrum,
      amplitudes,
      6,
      0.5
    );
    let maxError = 0;
    let numNonZero = 0;
    for (let i = 0; i < detunings.length; ++i) {
      const ratio = centsToValue(detunings[i]);

      for (let j = 0; j < voiceAmplitudes[i].length; ++j) {
        const amplitude = voiceAmplitudes[i][j];
        if (amplitude) {
          numNonZero++;
          for (let k = 0; k < spectrum.length; ++k) {
            if (Math.abs(amplitudes[k] - amplitude) < 1e-4) {
              const error = centsError(ratio * j, spectrum[k]);
              maxError = Math.max(maxError, error);
            }
          }
        }
      }
    }
    expect(maxError).toBeLessThan(8);
    expect(numNonZero).toBe(20);
  });
});
