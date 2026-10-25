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
