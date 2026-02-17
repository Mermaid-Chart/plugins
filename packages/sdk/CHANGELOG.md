# Changelog

## 0.2.3

### Patch Changes

- [#37](https://github.com/Mermaid-Chart/plugins/pull/37) [`4a0c04c`](https://github.com/Mermaid-Chart/plugins/commit/4a0c04cddf223d9c1814233c2d7aa5f49faf1315) Thanks [@Prashant-7718](https://github.com/Prashant-7718)! - feat: expose AI credit remaining API in SDK

  Add `getAICredits` method to the SDK for fetching user's AI credits from `/rest-api/users/me/ai-credit-usage` endpoint

- [#36](https://github.com/Mermaid-Chart/plugins/pull/36) [`0f832dc`](https://github.com/Mermaid-Chart/plugins/commit/0f832dceef3ced1a7886aa3c94c8982cd6a7ae39) Thanks [@Prashant-7718](https://github.com/Prashant-7718)! - fix: correct request timeout initialization order in MermaidChart constructor so the Axios instance uses the configured timeout before making requests

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UNRELEASED]

### Fixed

- Fixed `requestTimeout` option not being applied correctly to requests.
- Add `MermaidChart#getAICredits()` function to get users ai credit usage(Total and remaining credits)

## [0.2.2] - 2026-02-04

### Changes

- Removed validation of access token on initialization.
- Set a 30 second default timeout for all requests
- `MermaidChart#resetAccessToken()` no longer returns a `Promise`.

### Added

- Added `requestTimeout` option to configure timeout.
- Added `MermaidChart#repairDiagram(request)` function to repair broken Mermaid diagrams using AI.

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
