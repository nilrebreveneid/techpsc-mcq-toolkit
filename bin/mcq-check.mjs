#!/usr/bin/env node
import { lstat, readdir, open } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import { validateCollection, summarize } from '../src/validator.mjs';

const HELP = `TechPSC MCQ Toolkit — local JSON validation
Usage: node bin/mcq-check.mjs <file.json|directory> [options]
  --options N          Required options per question (2–100; default 4)
  --expected N         Required question count per file
  --topic-keywords F   Enable topic coherence checks using keyword mapping JSON
  --min-topic-match N  Minimum topic keyword match ratio from 0 to 1 (default 0.5)
  --style-checks       Enable answer-position and option-length warnings
  --verbose            Include per-question topic mismatch indexes
  --format text|json   Output format (default text)
  --fail-on-warnings   Exit 1 for warnings as well as errors
  --help               Show help
Exit codes: 0 passed, 1 validation failed, 2 usage or input error.
UTF-8 JSON only; maximum file size 16 MiB; symlinks are not followed.
No network calls. No file changes. Reports omit question text and answer values.
`;
const MAX_BYTES = 16 * 1024 * 1024;

function parseArgs(args) {
  const config = { optionCount: 4, format: 'text', failOnWarnings: false, minTopicMatch: 0.5, styleChecks: false, verbose: false };
  let minTopicMatchSpecified = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') { config.help = true; continue; }
    if (arg === '--fail-on-warnings') { config.failOnWarnings = true; continue; }
    if (arg === '--style-checks') { config.styleChecks = true; continue; }
    if (arg === '--verbose') { config.verbose = true; continue; }
    if (['--options', '--expected', '--format', '--topic-keywords', '--min-topic-match'].includes(arg)) {
      const value = args[++i];
      if (value === undefined) throw new Error(`${arg} requires a value.`);
      if (arg === '--format') {
        if (!['text', 'json'].includes(value)) throw new Error('--format must be text or json.');
        config.format = value;
      } else if (arg === '--topic-keywords') {
        config.topicKeywordsPath = value;
      } else if (arg === '--min-topic-match') {
        if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+)$/u.test(value)) throw new Error('--min-topic-match must be a number between 0 and 1.');
        config.minTopicMatch = Number(value);
        minTopicMatchSpecified = true;
      } else {
        if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`${arg} requires a positive integer.`);
        if (arg === '--options') config.optionCount = Number(value);
        else config.expectedQuestions = Number(value);
      }
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (config.input) throw new Error('Provide exactly one input file or directory.');
    else config.input = arg;
  }
  if (!config.help && !config.input) throw new Error('An explicit input file or directory is required.');
  if (config.optionCount < 2 || config.optionCount > 100) throw new Error('--options must be between 2 and 100.');
  if (minTopicMatchSpecified && !config.topicKeywordsPath) throw new Error('--min-topic-match requires --topic-keywords.');
  return config;
}

function isValidTopicKeywords(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([pattern, keywords]) =>
    pattern.trim().length > 0 && Array.isArray(keywords) && keywords.length > 0 &&
    keywords.every(keyword => typeof keyword === 'string' && keyword.trim().length > 0));
}

async function collect(input) {
  const stat = await lstat(input);
  if (stat.isSymbolicLink()) throw new Error('The input must not be a symbolic link.');
  if (stat.isFile()) {
    if (extname(input).toLowerCase() !== '.json') throw new Error('The input file must have a .json extension.');
    return { root: null, paths: [input] };
  }
  if (!stat.isDirectory()) throw new Error('The input must be a regular JSON file or directory.');
  const paths = [];
  const pending = [input];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      // Never descend into hidden folders, dependency trees, or symlinks.
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && extname(entry.name).toLowerCase() === '.json') paths.push(path);
    }
  }
  return { root: input, paths: paths.sort() };
}

async function readJson(path) {
  const handle = await open(path, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('SIZE');
    // Read at most the limit + 1, including files growing during this read.
    const bytes = Buffer.alloc(Math.min(stat.size + 1, MAX_BYTES + 1));
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, null);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > stat.size || offset > MAX_BYTES) throw new Error('SIZE');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, offset));
    return JSON.parse(text);
  } finally { await handle.close(); }
}

async function main() {
  let config;
  try { config = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; return; }
  if (config.help) { console.log(HELP); return; }
  try {
    if (config.topicKeywordsPath) {
      let topicKeywords;
      try { topicKeywords = await readJson(resolve(config.topicKeywordsPath)); }
      catch {
        console.error('Unable to read --topic-keywords file. Check its path, permissions, size, and UTF-8 JSON format.');
        process.exitCode = 2;
        return;
      }
      if (!isValidTopicKeywords(topicKeywords)) {
        console.error('Invalid --topic-keywords file. Expected a non-empty object mapping file or quizId globs to non-empty keyword arrays.');
        process.exitCode = 2;
        return;
      }
      config.topicKeywords = topicKeywords;
    }
    const { root, paths } = await collect(resolve(config.input));
    if (!paths.length) throw new Error('No JSON files found.');
    const documents = [];
    const failures = [];
    for (const path of paths) {
      const name = root ? relative(root, path).split('\\').join('/') : basename(path);
      try {
        const payload = await readJson(path);
        const isSelectedKeywordFile = root && config.topicKeywordsPath && path === resolve(config.topicKeywordsPath);
        const isKeywordMap = root && !Array.isArray(payload?.questions) && isValidTopicKeywords(payload);
        // Topic keyword maps are configuration, not question banks. Excluding them
        // makes a config file safe to keep beside the examples or input directory.
        if (isSelectedKeywordFile || isKeywordMap) continue;
        documents.push({ name, payload });
      }
      catch (error) {
        const message = error.message === 'SIZE' ? 'File is too large or changed during reading.' : 'File is unreadable or is not valid UTF-8 JSON.';
        failures.push({ file: name, valid: false, questionCount: 0,
          issues: [{ severity: 'error', code: 'INPUT_ERROR', path: '$', message }] });
      }
    }
    if (!documents.length && !failures.length) throw new Error('No question-bank JSON files found.');
    const validated = validateCollection(documents, config);
    const report = summarize([...validated.files, ...failures].sort((a, b) => a.file.localeCompare(b.file)));
    if (config.format === 'json') console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`${report.fileCount} files · ${report.questionCount} questions · ${report.errors} errors · ${report.warnings} warnings`);
      for (const file of report.files) for (const issue of file.issues) {
        console.log(`${issue.severity.toUpperCase()} ${file.file} ${issue.path} ${issue.code}: ${issue.message}`);
      }
    }
    process.exitCode = failures.length ? 2 : (!report.valid || (config.failOnWarnings && report.warnings) ? 1 : 0);
  } catch {
    // Do not dump OS errors containing absolute local paths or file contents.
    console.error('Unable to inspect input. Check the path, permissions, and JSON file selection.');
    process.exitCode = 2;
  }
}
await main();
