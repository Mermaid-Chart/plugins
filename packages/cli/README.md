# @mermaidchart/cli

CLI for interacting with https://MermaidChart.com, the platform that makes collaborating with Mermaid diagrams easy!

## Usage

```bash
mermaid-chart <command>
```

Use `--help` to see options!

```bash
mermaid-chart --help
```

`@mermaidchart/cli` allows you to easily sync local diagrams with your diagrams
on https://mermaidchart.com.

### `login`

Firstly, go to https://www.mermaidchart.com/app/user/settings and generate an
API key, which you can then setup by running:

```bash
mermaid-chart login
```

### `link` an existing Mermaid diagram to MermaidChart.com

You can link a local Mermaid diagram to MermaidChart using:

```bash
mermaid-chart link ./path/to/my/mermaid-digram.mmd
```

This will add an `id: xxxx-xxxxx-xxxxx` field to your diagram's YAML frontmatter,
which points to the diagram on MermaidChart.com:

````markdown
```mermaid
---
title: My diagram
id: xxxx-xxxxx-xxxxx # this field is created by @mermaidchart/cli
---
flowchart
  x[My Diagram]
```
````

### `push` local changes to MermaidChart.com

Once you've made some local changes, you can `push` your changes to MermaidChart.com

```console
$ mermaid-chart push ./path/to/my/mermaid-digram.mmd
✅ - ./path/to/my/mermaid-digram.mmd was pushed
```

### `pull` changes from MermaidChart.com

You can use `pull` to pull down changes from MermaidChart.com.

```console
$ mermaid-chart pull ./path/to/my/mermaid-digram.mmd
✅ - ./path/to/my/mermaid-digram.mmd was updated
```

Or use the `--check` flag to throw an error if your local file would have been
updated:

```console
$ mermaid-chart pull ./path/to/my/mermaid-digram.mmd
❌ - ./path/to/my/mermaid-digram.mmd would be updated
```
