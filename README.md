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
const tolerance = 1.23; // In cents
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

## Installation ##
```bash
npm i
```

## Documentation ##
Documentation is hosted at the project [Github pages](https://xenharmonic-devs.github.io/aperiodic-oscillator).

To generate documentation locally run:
```bash
npm run doc
```
