# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Compile an ESM version of this codebase for Node.JS v18.

### Fixed

- `MermaidChart#getAuthorizationData()` now correctly sets `state` in the URL
  by default.
- `MermaidChart#handleAuthorizationResponse()` now supports relative URLs.

## [0.1.1] - 2023-09-08
- Browser-only build.
