#!/usr/bin/env bash
set -euo pipefail
task_dir=$(mktemp -d)
trap 'rm -rf "$task_dir"' EXIT
archive=$(npm pack --silent --pack-destination "$task_dir")
mkdir "$task_dir/consumer"
npm install --prefix "$task_dir/consumer" --ignore-scripts --no-audit --no-fund "$task_dir/$archive"
printf '# Example\n\n```bash\npython run.py\n```\n' > "$task_dir/consumer/README.md"
printf 'raise Exception("must never execute")\n' > "$task_dir/consumer/run.py"
node "$task_dir/consumer/node_modules/@rockenzo/readme-reality/dist/cli.mjs" check "$task_dir/consumer" --format json > "$task_dir/result.json"
node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.summary.passed!==1||r.summary.errors!==0)process.exit(1)' "$task_dir/result.json"
