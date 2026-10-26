# Validation evidence

Collected 25 October 2026. These are static-check results, not application runtime, accuracy or user-adoption claims.

## Real repositories

The bundled CLI ran read-only on shallow public checkouts with LFS downloads disabled. No target code or installation commands were executed. Full findings, exact commits and timestamps are in [the machine-readable record](real-repository-results.json).

| Snapshot | Checked | Passed | Errors | Not checked |
| --- | ---: | ---: | ---: | ---: |
| NLP-Cyber-Harm-Detection at `9e84da28919442851d21cd0bbcc2e0a81008c76c` | 16 | 16 | 0 | 19 |
| Roadster-and-Beyond at `720b99b8a542ba6011a467fff68c786f0bd4a2ca` | 15 | 15 | 0 | 8 |

These two snapshots are a small smoke sample, not a representative benchmark. Skips remain visible. Existing files do not prove that downloaded weights, dependencies or applications work. Setup commands such as environment-prefixed clones are not simulated; their subsequent working directory is unknown.

Reproduce after checking out the recorded commit:

```bash
node /path/to/release/package/dist/cli.mjs check /path/to/snapshot --format json
```

## A real historical error

[The historical fixture](../examples/historical-nlp.json) records NLP-Cyber-Harm-Detection at `6c710db399dad0e73d6e1893303d8bebf19b7d64`, before the documentation correction. It preserves the original README, its hash and a non-truncated Git tree's file paths. Non-README file values are empty metadata placeholders, not the original file contents.

The original README references three absent scripts: `scripts/prepare_reasoning_data.py`, `scripts/train_reasoning_llm.py`, and `demos/reasoning_llm_demo.py`. The shared engine finds all three at lines 106, 112 and 119. [The full report](../examples/historical-nlp-report.json) records 13 checked references, three errors and 36 skips. This describes that historical commit, **not current main**. An automated regression test keeps this case reproducible.

## Verification gates

Unit and integration tests cover each rule's supported, broken and unsupported cases, source positions, quoted paths, working-directory changes, invalid manifests, symlinks, outside-root access, bounded reads, output escaping, CLI exit codes and Action/CLI/core parity. A package smoke test installs the built archive into an empty temporary consumer and runs it without target dependencies.

CI repeats verification on Node 22/24 Linux and Node 24 macOS/Windows, checks that the committed Action bundle matches source, and runs Chromium tests for keyboard operation, narrow screens, evidence disclosure, edited input, empty/error states and axe accessibility checks. Passing axe checks do not establish complete accessibility conformance. See the repository's Verify workflow for actual run outcomes.

## Demo

[The GIF](demo.gif) is a real local Chromium recording, converted from screen video. [Provenance](demo-recording.json) records time, source hashes, viewport, output hashes and duration. The interactive examples are labelled fictional snapshots whose results are calculated by the shared engine. They do not claim live remote repository scanning. The MP4 is supplied as a release asset.

## HTML profile-media support (v0.2.0)

On 26 October 2026, an internal run against the public profile at `b3a9c7ea0e7b4a74a0727360d45041c6e89dc4e5` compared the published v0.1.1 CLI with the new shared engine. The former checked no references in the HTML-based profile; the new engine checks all 7 local image references (7 passes, 0 errors), while 87 external/unsupported references and commands remain explicitly unverified. Removing the actual `assets/demo-proof.gif` in the temporary checkout leaves v0.1.1 at exit 0 but makes both the new bundled CLI and Action fail at its README line; the asset is then restored. This is a coverage comparison on one known snapshot, not an accuracy benchmark or a claim that the complete profile is verified. The tool does not decode GIFs or execute HTML.

The expanded suite covers quoted/unquoted HTML attributes, entities and URI encoding, multiline/CRLF/non-BMP locations, inline and fenced code, comments, inert containers, unsupported resource attributes, base-URL abstention, dynamic/empty values and outside-root refusal. Browser tests include the Profile media example and ensure supplied HTML is rendered as report text, never executed.

Automatic review identified multiline blockquote prefixes that hid HTML attributes and unresolved Liquid tag URLs that were incorrectly treated as invalid URL encoding. Both were reproduced as failing regressions, then fixed by using Markdown AST HTML values (retaining original line counts) and explicit Liquid abstention. Nested list/quote and CRLF cases are included.
