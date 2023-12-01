# Test markdown file with some linked diagrams and some unlinked diagrams

Here is a markdown comment: <!-- Hello World -->

This is a journey diagram that is already linked.

```mermaid
---
id: xxxxxxx-journey
---
journey
    title This is a linked journey diagram.
    section Use mermaidchart.com CLI
        Run link command: 5: Me
        Edit diagram on mermaidchart.com: 5: Me
        Run pull command to sync changes locally: 5: Me
```

This is a class diagram that isn't linked.

```mermaid
classDiagram
    note "From local to mermaidchart"
    mermaidchart <|-- local
```
