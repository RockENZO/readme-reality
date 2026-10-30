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
mkdir "$task_dir/consumer/docs"
printf '[present](../run.py)\n' > "$task_dir/consumer/docs/start.md"
printf '# Example\n\n```bash\npython missing.py\n```\n' > "$task_dir/consumer/README.md"
if node "$task_dir/consumer/node_modules/@rockenzo/readme-reality/dist/cli.mjs" check "$task_dir/consumer" --readme README.md --readme docs/start.md --format json > "$task_dir/batch.json"; then
  exit 1
else
  test "$?" -eq 1
fi
node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.kind!=="batch"||r.summary.documents!==2||r.summary.errors!==1||r.summary.passed!==1)process.exit(1)' "$task_dir/batch.json"
if node "$task_dir/consumer/node_modules/@rockenzo/readme-reality/dist/cli.mjs" check "$task_dir/consumer" --readme docs/start.md --readme absent.md --format json > "$task_dir/invalid.json"; then
  exit 1
else
  test "$?" -eq 2
fi
node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.status!=="invalid"||r.summary.inputErrors!==1||r.summary.passed!==1)process.exit(1)' "$task_dir/invalid.json"
