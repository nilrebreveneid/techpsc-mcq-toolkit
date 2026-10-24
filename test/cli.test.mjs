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
  for (const args of [[], ['--unknown'], ['x', '--options', '0'], ['x', '--format', 'yaml'], ['x', '--expected'], ['x', '--topic-keywords'], ['x', '--min-topic-match', '1.2'], ['x', '--min-topic-match', '0.5'], ['x', 'y']]) {
    assert.equal(run(...args).status, 2);
  }
});
test('bundled English and Nepali examples pass', () => {
  const result = spawnSync(process.execPath,
    [join(root, 'scripts', 'check-valid-examples.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '4 files · 14 questions · 0 errors · 0 warnings');
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
  try { await symlink(join(directory, 'nested'), join(directory, 'linked')); }
  catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
  }
  const result = run(directory, '--format', 'json');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).fileCount, 1);
});
test('rejects explicit symlink input', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'sample.json'), JSON.stringify(valid));
  try { await symlink(join(directory, 'sample.json'), join(directory, 'linked.json')); }
  catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
      t.skip('Windows runner does not allow creating a symlink for this test.');
      return;
    }
    throw error;
  }
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
test('topic keyword CLI reports a privacy-safe warning and info indexes', async t => {
  const directory = await fixture(t);
  const questionText = 'PRIVATE TOPIC QUESTION MUST NOT LEAK';
  await writeFile(join(directory, 'geometry.json'), JSON.stringify({ questions: [
    { question: 'A triangle has three sides.', options: ['A', 'B', 'C', 'D'], answer: 0 },
    { question: questionText, options: ['A', 'B', 'C', 'D'], answer: 0 },
    { question: 'A private unmatched sample about chemistry.', options: ['A', 'B', 'C', 'D'], answer: 0 }
  ] }));
  const keywordFile = join(directory, 'keywords.json');
  await writeFile(keywordFile, JSON.stringify({ 'geometry*.json': ['triangle'] }));
  const result = run(directory, '--topic-keywords', keywordFile, '--verbose', '--format', 'json');
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const issues = report.files[0].issues;
  assert.ok(issues.some(issue => issue.code === 'TOPIC_LOW_MATCH'));
  assert.ok(issues.some(issue => issue.code === 'TOPIC_NO_KEYWORD' && issue.path === '$.questions[1]'));
  assert.equal(result.stdout.includes(questionText), false);
});
test('missing or malformed topic keyword files fail clearly with exit code 2', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'sample.json'), JSON.stringify(valid));
  const missing = run(directory, '--topic-keywords', join(directory, 'missing.json'));
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /Unable to read --topic-keywords file/u);

  const invalidFile = join(directory, 'keywords.json');
  await writeFile(invalidFile, JSON.stringify({ 'sample.json': 'not-an-array' }));
  const invalid = run(directory, '--topic-keywords', invalidFile);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Invalid --topic-keywords file/u);
});
test('valid topic keyword maps are not mistaken for banks during directory scans', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'sample.json'), JSON.stringify(valid));
  await writeFile(join(directory, 'keywords.json'), JSON.stringify({ 'sample.json': ['sample'] }));
  const result = run(directory, '--fail-on-warnings');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(run(directory, '--format', 'json').stdout).fileCount, 1);
});
test('CLI handles Nepali Unicode input paths', async t => {
  const directory = await fixture(t);
  const nepaliDirectory = join(directory, 'नेपाली');
  await mkdir(nepaliDirectory);
  await writeFile(join(nepaliDirectory, 'प्रश्न.json'), JSON.stringify(valid));
  const result = run(directory, '--format', 'json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).files[0].file, 'नेपाली/प्रश्न.json');
});
test('oversized file is rejected before full parsing', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'large.json'), ' '.repeat(16 * 1024 * 1024 + 1));
  const result = run(directory, '--format', 'json');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /INPUT_ERROR/);
});
