const EPSILON = 1e-6;

function valueToCents(x: number) {
  return Math.log2(x) * 1200;
}

export function centsError(a: number, b: number) {
  return Math.abs(valueToCents(a / b));
}

/**
 * Allocate voice detunings to approximate the given inharmonic spectrum
 * @param spectrum Partial ratios ordered by priority
 * @param maxVoices Maximum number of voices to allocate
 * @param jnd Largest acceptable error in cents
 * @returns Voice ratios.
 */
function allocateRatios(spectrum: number[], maxVoices: number, jnd: number) {
  const result: number[] = [];
  allocation: for (const ratio of spectrum) {
    // Allocate the first voices with reduced tolerance.
    const tolerance = result.length < maxVoices ? EPSILON : jnd;
    for (let i = 0; i < result.length; ++i) {
      const harmonic = Math.round(ratio / result[i]);
      if (centsError(harmonic * result[i], ratio) < tolerance) {
        continue allocation;
      }
      let denominator = 2;
      while (result[i] > 0.1 * denominator) {
        const newHarmonic = Math.round((ratio * denominator) / result[i]);
        if (centsError(newHarmonic * result[i], ratio * denominator) < jnd) {
          result[i] /= denominator;
          continue allocation;
        }
        denominator++;
      }
    }
    if (result.length < maxVoices) {
      result.push(ratio);
    }
  }
  return result;
}

/**
 * Allocate voice detunings to approximate the given inharmonic spectrum
 * @param spectrum Partial ratios ordered by priority
 * @param amplitudes Partial amplitudes
 * @param maxVoices Maximum number of voices to allocate
 * @param jnd Largest acceptable error in cents
 * @returns Array of [voice detunings in cents, voice harmonic amplitudes]
 */
export function allocateVoices(
  spectrum: number[],
  amplitudes: number[],
  maxVoices: number,
  jnd: number
): [number[], Float32Array[]] {
  const voiceRatios = allocateRatios(spectrum, maxVoices, jnd);
  const voiceAmplitudes: number[][] = voiceRatios.map(() => []);
  for (let i = 0; i < spectrum.length; ++i) {
    const ratio = spectrum[i];
    let leastError = Infinity;
    let bestIndex = 0;
    let bestHarmonic = 1;
    for (let j = 0; j < voiceRatios.length; ++j) {
      const harmonic = Math.round(ratio / voiceRatios[j]);
      const error = centsError(harmonic * voiceRatios[j], ratio);
      if (error < leastError) {
        leastError = error;
        bestIndex = j;
        bestHarmonic = harmonic;
      }
    }
    // Abuse JS arrays
    const existing = voiceAmplitudes[bestIndex][bestHarmonic] ?? 0;
    voiceAmplitudes[bestIndex][bestHarmonic] = existing + amplitudes[i];
  }
  for (const coefs of voiceAmplitudes) {
    // Repair JS arrays
    for (let i = 0; i < coefs.length; ++i) {
      coefs[i] ??= 0;
    }
  }
  return [
    voiceRatios.map(valueToCents),
    voiceAmplitudes.map(a => new Float32Array(a)),
  ];
}
