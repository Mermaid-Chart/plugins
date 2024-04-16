---
description: |
    Here is a YAML frontmatter, supported by GitHub (by not GFM!!), Docusaurus,
    Vitepress, etc.
---

# This is an unusual markdown file with non-standard syntax

See <https://github.github.com/gfm> for some of GitHub's
GitHub Flavored Markdown extensions.

Here is a markdown comment: <!-- Hello World -->

This is my text with a footnote.[^1]

[^1]: This is my footnote.

This is a ~~strikethrough~~.

Here is some math (not part of GFM): $ x=5 + 1 $

Here is some more math:

```math
\sum_{n=1}^{\infty} x = \infty
```

## Here is a table

| foo | bar |
| --- | --- |
| baz | bim |

## Here is my Mermaid diagram in a quote in a list

* This is my list
  * This is my list
    1. This is another list entry.
    2. And another one.
    3. This is my entry with the diagram:
       > Here is my quote with the diagram:
       >
       > ```mermaid
       > ---
       > title: This is my diagram title
       > ---
       > flowchart
       >     A[Hello World]
       > ```
