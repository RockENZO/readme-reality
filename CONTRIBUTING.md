# Contributing

Small, reproducible false-positive reports are valuable. Include the Markdown, a minimal file tree or synthetic fixture, expected result, actual JSON, Node/tool versions and OS. Remove credentials and private source before sharing.

Run `npm ci`, `npm run verify`, and the browser checks described in README. Include a regression for changed behavior. Rebuild `action/index.cjs` with `npm run build`; source and bundle must match. Keep unsupported constructs explicit instead of guessing their meaning. Do not execute README commands to implement new checks.

No star exchanges, user-count claims or accuracy claims belong in test evidence. Existing tools have overlapping features; compare specific capabilities fairly.
