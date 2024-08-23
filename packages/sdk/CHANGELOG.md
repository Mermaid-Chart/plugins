# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UNRELEASED]

### Changes

- Uses KY instead of Axios for HTTP requests.
- Set a 30 second default timeout for all requests
- `MermaidChart#resetAccessToken()` no longer returns a `Promise`.

### Added

- Added `requestTimeout` option to configure timeout.

## [0.2.0] - 2024-04-11

### Added

- Compile an ESM version of this codebase for Node.JS v18.
- Add `MermaidChart#getDiagram(diagramID)` function to get a diagram.
- Add `MermaidChart#createDocument(projectID)` function to create a diagram in a project.
- Add `MermaidChart#setDocument(document)` function to update a diagram.
- Add `MermaidChart#deleteDocument(documentID)` function to delete a diagram.
- Add `MermaidChart#baseURL` is now public.

### Fixed

- **BREAKING:** Fix `MCDocument` `major`/`minor` type to `number`.
- Add `code` field to `MCDocument` type.
- `MermaidChart#getAuthorizationData()` now correctly sets `state` in the URL
  by default.
- `MermaidChart#handleAuthorizationResponse()` now supports relative URLs.

## [0.1.1] - 2023-09-08

- Browser-only build.
