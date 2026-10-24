#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const inputs = [
  'examples/english.json',
  'examples/nepali.json',
  'examples/topic-coherence'
];
let fileCount = 0;
let questionCount = 0;

for (const input of inputs) {
  const result = spawnSync(process.execPath,
    ['bin/mcq-check.mjs', input, '--fail-on-warnings'], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    process.exit(result.status ?? 1);
  }
  const match = result.stdout.match(/^(\d+) files? · (\d+) questions? · 0 errors? · 0 warnings?$/mu);
  if (!match) {
    process.stderr.write(`Unexpected example-check output for ${input}.\n`);
    process.exit(1);
  }
  fileCount += Number(match[1]);
  questionCount += Number(match[2]);
}

console.log(`${fileCount} files · ${questionCount} questions · 0 errors · 0 warnings`);
