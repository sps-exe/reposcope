#!/usr/bin/env node

/**
 * Verify collection YAML configs.
 *
 * Checks:
 * 1. YAML format and id uniqueness
 * 2. Repo names are valid and exist on GitHub
 * 3. Detects renamed repos and suggests fixes
 *
 * Usage:
 *   node scripts/verify-collection.mjs
 *   node scripts/verify-collection.mjs --fix-suggestions
 *
 * Env:
 *   GITHUB_ACCESS_TOKENS  comma-separated GitHub tokens (optional, avoids rate limits)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const collectionsDir = join(root, 'configs', 'collections');
const showFix = process.argv.includes('--fix-suggestions');

const REPO_NAME_RE = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]{1,100}$/;

// --- Simple YAML parser (same as load-collection.mjs) ---
function parseCollectionYaml(text) {
  const lines = text.split('\n');
  const result = { items: [] };
  let inItems = false;
  for (const line of lines) {
    if (line.startsWith('id:')) result.id = parseInt(line.slice(3).trim());
    else if (line.startsWith('name:')) result.name = line.slice(5).trim();
    else if (line.trim() === 'items:') inItems = true;
    else if (inItems && line.trim().startsWith('- ')) result.items.push(line.trim().slice(2).trim());
  }
  return result;
}

// --- GitHub API with token rotation ---
const tokens = (process.env.GITHUB_ACCESS_TOKENS || process.env.GITHUB_TOKEN || '')
  .split(',')
  .map(t => t.trim())
  .filter(Boolean);
let tokenIndex = 0;

async function ghFetch(url) {
  const headers = { 'User-Agent': 'reposcope-verify', Accept: 'application/json' };
  if (tokens.length > 0) {
    headers.Authorization = `token ${tokens[tokenIndex++ % tokens.length]}`;
  }
  // Do NOT follow redirects — we want to detect 301 (renamed repos)
  const res = await fetch(url, { headers, redirect: 'manual' });
  return res;
}

async function checkRepo(repoName) {
  const res = await ghFetch(`https://api.github.com/repos/${repoName}`);
  if (res.status === 200) return { exists: true, renamed: false };
  if (res.status === 301) {
    // Repo was renamed, follow redirect to get new name
    const location = res.headers.get('location');
    if (location) {
      const follow = await fetch(location, {
        headers: { 'User-Agent': 'reposcope-verify', Accept: 'application/json',
          ...(tokens.length ? { Authorization: `token ${tokens[tokenIndex++ % tokens.length]}` } : {}) },
      });
      if (follow.ok) {
        const data = await follow.json();
        return { exists: true, renamed: true, newName: data.full_name };
      }
    }
    return { exists: true, renamed: true, newName: null };
  }
  if (res.status === 404) return { exists: false, renamed: false };
  // Rate limited or other error — warn but don't fail
  console.warn(`  ⚠ GitHub API returned ${res.status} for ${repoName}, skipping check`);
  return { exists: true, renamed: false }; // Assume OK
}

// --- Main ---
const files = readdirSync(collectionsDir).filter(f => f.endsWith('.yml'));
const configs = files.map(f => {
  const text = readFileSync(join(collectionsDir, f), 'utf-8');
  return { file: f, ...parseCollectionYaml(text) };
});

console.log(`Loaded ${configs.length} collection configs.\n`);

const errors = [];
const renames = [];
const idsSeen = new Map(); // id -> filename

// Phase 1: Format & uniqueness checks
for (const config of configs) {
  // Check id uniqueness
  if (idsSeen.has(config.id)) {
    errors.push(`${config.file}: id ${config.id} conflicts with ${idsSeen.get(config.id)}`);
  } else {
    idsSeen.set(config.id, config.file);
  }

  // Check repo name format
  const dupes = new Set();
  for (const repo of config.items) {
    if (!REPO_NAME_RE.test(repo)) {
      errors.push(`${config.file}: invalid repo name format "${repo}"`);
    }
    if (dupes.has(repo)) {
      errors.push(`${config.file}: duplicate repo "${repo}"`);
    }
    dupes.add(repo);
  }
}

// Phase 2: GitHub existence checks (batched with small delay to avoid rate limits)
const allRepos = [...new Set(configs.flatMap(c => c.items))];
console.log(`Checking ${allRepos.length} unique repos against GitHub API...\n`);

let checked = 0;
for (const repo of allRepos) {
  const result = await checkRepo(repo);
  checked++;
  if (checked % 50 === 0) console.log(`  ... checked ${checked}/${allRepos.length}`);

  if (!result.exists) {
    errors.push(`Repo not found on GitHub: ${repo}`);
  } else if (result.renamed) {
    const msg = result.newName
      ? `Repo renamed: ${repo} → ${result.newName}`
      : `Repo renamed: ${repo} (could not determine new name)`;
    errors.push(msg);
    if (result.newName) renames.push({ old: repo, new: result.newName });
  }

  // Small delay to be nice to GitHub API
  if (checked % 10 === 0) await new Promise(r => setTimeout(r, 100));
}

console.log(`\nChecked ${allRepos.length} repos.\n`);

if (errors.length > 0) {
  console.error(`❌ ${errors.length} error(s) found:\n`);
  for (const e of errors) console.error(`  ${e}`);

  if (showFix && renames.length > 0) {
    console.log(`\n💡 Fix suggestions:\n`);
    console.log(`cd ${collectionsDir}`);
    for (const r of renames) {
      const escaped = (s) => s.replace(/\//g, '\\/');
      console.log(`find . -name "*.yml" -exec sed -i '' 's/${escaped(r.old)}/${escaped(r.new)}/g' {} +`);
    }
  }

  process.exit(1);
}

console.log(`✅ All ${configs.length} collections passed verification.`);
process.exit(0);
