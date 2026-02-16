# Mermaid Chart Plugins

This repository contains the source code for the Mermaid Chart plugins.

## Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing packages to npm.

When you make changes that should be released:

1. Run `pnpm changeset`
2. Select the affected package(s) and version bump (patch/minor/major)
3. Add a summary of the change
4. Commit the changeset file along with your code changes

After your PR is merged to `main`, the release workflow will create a "Version Packages" PR. Merging that PR will publish the updated package(s) to npm.

## API Documentation

The OpenAPI YAML file is located at [./openapi.yaml](./openapi.yaml).

[Swagger UI](https://editor.swagger.io/?url=https://raw.githubusercontent.com/Mermaid-Chart/plugins/main/openapi.yml)

## SDK

- [Javascript/Typescript](./packages/sdk)

## CLI

- [`@mermaidchart/cli` command-line interface](./packages/cli)

## Plugins

- [VSCode (to be migrated here)](https://github.com/Mermaid-Chart/vscode-mermaid-chart/)
- [Google Workspace](./packages/google)
