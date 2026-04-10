# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-04-10

### Changed
- Polish internal type definitions.

## [0.3.1] - 2026-04-06

### Added
- Added a package exports map for typed and JavaScript entry points.

### Changed
- Switched the TypeScript build to NodeNext ESM and fixed import paths, making the package a proper ESM module.
- Updated development dependencies to their latest compatible versions.
- Expanded README documentation with clearer setup guidance, API usage, and copy-paste-ready examples.
- Hardened input validation for aperiodic voice allocation.
- Added guards so `MultiOscillator.stop()` is ignored safely when called before `start()`.

### Fixed
- Fixed `MultiOscillator` disconnect behavior when a voice was already removed.

## [0.2.0] - 2026-04-01

### Changed
- Updated development dependencies to their latest compatible versions.
- Improved Typedoc generation.
- Applied dependency maintenance updates via `npm audit fix`.

## [0.1.1] - 2024-07-14

### Changed
- Maintenance release.

## [0.1.0] - 2024-01-09

### Added
- Initial release.

[Unreleased]: https://github.com/xenharmonic-devs/aperiodic-oscillator/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/xenharmonic-devs/aperiodic-oscillator/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/xenharmonic-devs/aperiodic-oscillator/compare/v0.2.0...v0.3.1
[0.2.0]: https://github.com/xenharmonic-devs/aperiodic-oscillator/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/xenharmonic-devs/aperiodic-oscillator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/xenharmonic-devs/aperiodic-oscillator/releases/tag/v0.1.0
