---
'@mermaidchart/sdk': patch
---

fix: correct request timeout initialization order in MermaidChart constructor so the Axios instance uses the configured timeout before making requests

pr: 36
