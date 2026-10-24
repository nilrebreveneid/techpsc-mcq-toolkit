#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath,
  ['bin/mcq-check.mjs', 'examples/invalid'], { encoding: 'utf8' });
assert.ifError(result.error);
assert.equal(result.status, 1, 'the deliberately invalid example must exit with validation status 1');
assert.match(result.stdout, /INVALID_ANSWER/u, 'the report must identify the invalid answer index');
assert.match(result.stdout, /invalid-bilingual\.json \$\.questions\[1\]\.answer/u,
  'the report must identify the file and location');
assert.doesNotMatch(result.stdout, /Synthetic English sample|नेपाली नमुना/u,
  'the report must not expose question text');
assert.equal(result.stderr, '', 'a normal validation failure should not produce a CLI runtime error');
console.log('Invalid bilingual sample rejected safely; report contains only codes and locations.');
