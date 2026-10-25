# Security

Please report vulnerabilities through GitHub's private reporting mechanism if available, or request a private contact channel without posting secrets. Do not include actual tokens or private file contents in public issues.

The tool is a static read-only checker, not an OS sandbox. Stable local snapshots are expected. Only selected Markdown and package manifests are read as bounded text; symlinks/special files and root escapes are refused. No target commands or install scripts are executed by scanning. Installing/building this tool and GitHub workflows have their normal platform trust boundaries.
