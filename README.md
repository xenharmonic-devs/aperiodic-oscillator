# aperiodic-oscillator
Non-periodic replacement for OscillatorNode from Web Audio API

## Examples
```typescript
// Standard Web Audio API
const context = new AudioContext();
const saw = new OscillatorNode(context, {type: 'sawtooth'});

// Unison oscillator consisting of five voices spread ±6.9 Hz in frequency.
const supersaw = new UnisonOscillator(context, {
  type: 'sawtooth',
  numberOfVoices: 5,
  spread: 6.9,
});

// Construct an inharmonic timbre
const ns = [...Array(129).keys()];
ns.shift();
const spectrum = ns.map(n => n ** 1.5);
const amplitudes = ns.map(n => 0.3 * n ** -1.5);
const maxNumberOfVoices = 7;
const tolerance = 0.1; // In cents
const timbre = new AperiodicWave(
  context,
  spectrum,
  amplitudes,
  maxNumberOfVoices,
  tolerance
);

// Aperiodic oscillator with an inharmonic timbre
const tine = new AperiodicOscillator(context, {aperiodicWave: timbre});
```

## API Overview
The package exports four primary public classes from `src/index.ts`: `AperiodicWave`, `MultiOscillator`, `UnisonOscillator`, and `AperiodicOscillator`.

### `AperiodicWave`
Builds an aperiodic timbre description that can be applied to an `AperiodicOscillator`.

Constructor:

```ts
new AperiodicWave(context, spectrum, amplitudes, maxNumberOfVoices, tolerance)
```

- `maxNumberOfVoices` (count, integer): no default in the constructor; caller must provide a finite integer `>= 1`.
- `tolerance` (cents): no default in the constructor; caller must provide a finite number `>= 0`.

### `MultiOscillator`
A base class wrapping one or more `OscillatorNode` voices and exposing oscillator-like behavior as one unit.

Constructor:

```ts
new MultiOscillator(context, options?)
```

`options` (all optional):

- `frequency` (Hz): default `440`.
- `detune` (cents): default `0`.

### `UnisonOscillator`
Extends `MultiOscillator` with evenly distributed voice spread.

Constructor:

```ts
new UnisonOscillator(context, options?, mode?)
```

- `mode` defaults to `'detune'`.
- `options` (all optional):
  - `frequency` (Hz): default `440` (inherited).
  - `detune` (cents): default `0` (inherited).
  - `numberOfVoices` (count): default `1`.
  - `spread`:
    - In `mode = 'detune'` (default), spread is in **cents** and is distributed symmetrically from negative to positive offsets across voices.
    - In `mode = 'frequency'`, spread is in **Hz** and is distributed symmetrically from negative to positive frequency offsets across voices.
    - Default `0` in either mode.

### `AperiodicOscillator`
Extends `MultiOscillator` to apply `AperiodicWave` data per voice.

Constructor:

```ts
new AperiodicOscillator(context, options?)
```

`options` (all optional):

- `frequency` (Hz): default `440` (inherited).
- `detune` (cents): default `0` (inherited).
- `aperiodicWave`: no default; when provided, `setAperiodicWave()` is called during construction.

### Methods quick reference

| Class | Method | Purpose |
| --- | --- | --- |
| `MultiOscillator` | `setPeriodicWave(wave)` | Set a shared `PeriodicWave` for all voices (switches behavior to custom waveform). |
| `AperiodicOscillator` | `setAperiodicWave(wave)` | Apply per-voice detunings and per-voice `PeriodicWave` data from an `AperiodicWave`. |
| `MultiOscillator` / subclasses | `dispose()` | Disconnect and stop managed audio nodes/voices safely. |

### Validation and errors
Input validation in `src/harmonic-allocator.ts` enforces:

- `spectrum.length === amplitudes.length`.
- `maxNumberOfVoices` must be a finite integer `>= 1`.
- `tolerance` must be a finite number `>= 0`.
- every `spectrum[i]` must be a finite number `> 0`.
- every `amplitudes[i]` must be a finite number `>= 0`.

Violations throw `Error` with a message naming the invalid parameter and the received value.

## Installation ##
Install the published package:

```bash
npm install aperiodic-oscillator
```

## Development ##
Set up the repository locally:

```bash
npm install
```

## Documentation ##
Documentation is hosted at the project [Github pages](https://xenharmonic-devs.github.io/aperiodic-oscillator).

To generate documentation locally run:
```bash
npm run doc
```
