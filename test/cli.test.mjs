import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cli = join(root, 'bin', 'mcq-check.mjs');
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const valid = { questions: [{ question: 'Original sample?', options: ['A', 'B', 'C', 'D'], answer: 0 }] };
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'mcq-toolkit-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('help and invalid arguments have stable exit codes', () => {
  assert.equal(run('--help').status, 0);
  for (const args of [[], ['--unknown'], ['x', '--options', '0'], ['x', '--format', 'yaml'], ['x', '--expected'], ['x', 'y']]) {
    assert.equal(run(...args).status, 2);
  }
});
test('bundled English and Nepali examples pass', () => {
  const result = run(join(root, 'examples'), '--format', 'json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).questionCount, 2);
});
test('invalid JSON does not expose original input in reports', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'broken.json'), '{ PRIVATE_CONTENT');
  const result = run(directory, '--format', 'json');
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).errors, 1);
  assert.equal(result.stdout.includes('PRIVATE_CONTENT'), false);
  assert.equal(result.stdout.includes(directory), false);
});
test('invalid schema exits 1 with useful codes', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'bad.json'), '{}');
  const result = run(directory);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /MISSING_QUESTIONS/);
});
test('cross-file warnings can fail CI by choice', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'a.json'), JSON.stringify(valid));
  await writeFile(join(directory, 'b.json'), JSON.stringify(valid));
  assert.equal(run(directory).status, 0);
  assert.equal(run(directory, '--fail-on-warnings').status, 1);
});
test('recurses but skips hidden directories, node_modules and symlinks', async t => {
  const directory = await fixture(t);
  await mkdir(join(directory, 'nested'));
  await mkdir(join(directory, '.hidden'));
  await mkdir(join(directory, 'node_modules'));
  await writeFile(join(directory, 'nested', 'sample.json'), JSON.stringify(valid));
  await writeFile(join(directory, '.hidden', 'secret.json'), '{}');
  await writeFile(join(directory, 'node_modules', 'bad.json'), '{}');
  await symlink(join(directory, 'nested'), join(directory, 'linked'));
  const result = run(directory, '--format', 'json');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).fileCount, 1);
});
test('rejects explicit symlink input', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'sample.json'), JSON.stringify(valid));
  await symlink(join(directory, 'sample.json'), join(directory, 'linked.json'));
  assert.equal(run(join(directory, 'linked.json')).status, 2);
});
test('empty or missing input directory exits 2', async t => {
  const directory = await fixture(t);
  assert.equal(run(directory).status, 2);
  assert.equal(run(join(directory, 'missing')).status, 2);
});
test('custom option and question counts work through CLI', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'two.json'), JSON.stringify({ questions: [{ question: 'Choose one', options: ['Yes', 'No'], answer: 0 }] }));
  assert.equal(run(directory, '--options', '2', '--expected', '1').status, 0);
  assert.equal(run(directory, '--options', '2', '--expected', '2').status, 1);
});
test('oversized file is rejected before full parsing', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'large.json'), ' '.repeat(16 * 1024 * 1024 + 1));
  const result = run(directory, '--format', 'json');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /INPUT_ERROR/);
});
