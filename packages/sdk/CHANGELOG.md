# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Compile an ESM version of this codebase for Node.JS v18.
- Add `MermaidChart#getDiagram(diagramID)` function to get a diagram.
- Add `MermaidChart#createDocument(projectID)` function to create a digram in a project.
- Add `MermaidChart#deleteDocument(documentID)` function to delete a diagram.

### Fixed

- Fix `MCDocument` `major`/`minor` type to `number`.

## [0.1.1] - 2023-09-08

- Browser-only build.
