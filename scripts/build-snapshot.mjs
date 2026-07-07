#!/usr/bin/env node
/**
 * Build the nightly snapshot: data/entries.json, data/entries.csv,
 * data/commodity.sqlite, and a CHANGELOG.md section derived from the diff
 * against the previous snapshot. No npm dependencies; needs Node 20+ and
 * the sqlite3 CLI on PATH.
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const API = process.env.API_BASE || 'https://c0mm0.com';

// ---------- fetch ----------

const res = await fetch(`${API}/api/v1/feeds/export/json`, {
  headers: { 'user-agent': 'commodity-data-snapshot/1.0 (+https://github.com/lapinponpin/c0mm0)' },
});
if (!res.ok) throw new Error(`export/json: HTTP ${res.status}`);
const payload = await res.json();
const entries = (payload.entries ?? []).sort((a, b) => a.slug.localeCompare(b.slug));
if (entries.length < 100) throw new Error(`Suspiciously small export (${entries.length} rows) — refusing to overwrite snapshot`);

const snapshotDate = new Date().toISOString().slice(0, 10);

// ---------- diff against previous snapshot (for CHANGELOG) ----------

let previous = [];
if (existsSync('data/entries.json')) {
  try {
    previous = JSON.parse(readFileSync('data/entries.json', 'utf8')).entries ?? [];
  } catch { /* first run or corrupt file — skip changelog */ }
}
const prevBySlug = new Map(previous.map((e) => [e.slug, e]));
const currBySlug = new Map(entries.map((e) => [e.slug, e]));

const added = entries.filter((e) => !prevBySlug.has(e.slug));
const removed = previous.filter((e) => !currBySlug.has(e.slug));
const changed = entries.filter((e) => {
  const p = prevBySlug.get(e.slug);
  return p && (p.verification_state !== e.verification_state || p.status !== e.status);
});

// ---------- write entries.json ----------

writeFileSync(
  'data/entries.json',
  JSON.stringify(
    {
      snapshot_date: snapshotDate,
      source: 'https://c0mm0.com',
      license: 'CC0-1.0',
      count: entries.length,
      entries,
    },
    null,
    1
  ) + '\n'
);

// ---------- write entries.csv ----------

const COLUMNS = [
  'id', 'name', 'slug', 'type', 'description', 'country_code',
  'homepage_url', 'docs_url', 'repo_url', 'free_access_class', 'auth_type',
  'status', 'verification_state', 'tags', 'created_at', 'updated_at', 'last_verified_at',
];
const csvEscape = (v) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join(';') : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
writeFileSync(
  'data/entries.csv',
  [COLUMNS.join(','), ...entries.map((e) => COLUMNS.map((c) => csvEscape(e[c])).join(','))].join('\n') + '\n'
);

// ---------- write commodity.sqlite ----------

const sqlEscape = (v) => {
  if (v == null) return 'NULL';
  const s = Array.isArray(v) ? JSON.stringify(v) : String(v);
  return `'${s.replace(/'/g, "''")}'`;
};
const sql = [
  'PRAGMA journal_mode=OFF;',
  'BEGIN;',
  `CREATE TABLE entries (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, description TEXT, country_code TEXT,
    homepage_url TEXT, docs_url TEXT, repo_url TEXT,
    free_access_class TEXT, auth_type TEXT, status TEXT,
    verification_state TEXT, tags TEXT, created_at TEXT, updated_at TEXT,
    last_verified_at TEXT
  );`,
  ...entries.map(
    (e) => `INSERT INTO entries VALUES (${COLUMNS.map((c) => sqlEscape(e[c])).join(',')});`
  ),
  'CREATE INDEX idx_entries_country ON entries(country_code);',
  'CREATE INDEX idx_entries_type ON entries(type);',
  `CREATE TABLE snapshot_meta (key TEXT PRIMARY KEY, value TEXT);`,
  `INSERT INTO snapshot_meta VALUES ('snapshot_date', '${snapshotDate}'), ('source', 'https://c0mm0.com'), ('license', 'CC0-1.0');`,
  'COMMIT;',
].join('\n');

rmSync('data/commodity.sqlite', { force: true });
const sqlite = spawnSync('sqlite3', ['data/commodity.sqlite'], { input: sql, encoding: 'utf8' });
if (sqlite.status !== 0) throw new Error(`sqlite3 failed: ${sqlite.stderr}`);

// ---------- prepend CHANGELOG section ----------

if (previous.length > 0 && (added.length || removed.length || changed.length)) {
  const line = (e, note) => `- ${e.name} (\`${e.slug}\`)${note ? ` — ${note}` : ''}`;
  const section = [
    `## ${snapshotDate}`,
    '',
    ...(added.length ? [`### Added (${added.length})`, ...added.slice(0, 25).map((e) => line(e)), ...(added.length > 25 ? [`- …and ${added.length - 25} more`] : []), ''] : []),
    ...(removed.length ? [`### Removed (${removed.length})`, ...removed.slice(0, 25).map((e) => line(e)), ...(removed.length > 25 ? [`- …and ${removed.length - 25} more`] : []), ''] : []),
    ...(changed.length ? [`### State changes (${changed.length})`, ...changed.slice(0, 25).map((e) => line(e, `${prevBySlug.get(e.slug).verification_state} → ${e.verification_state}`)), ...(changed.length > 25 ? [`- …and ${changed.length - 25} more`] : []), ''] : []),
  ].join('\n');

  const header = '# Changelog\n\nDerived nightly from snapshot diffs. Live feed: https://c0mm0.com/api/v1/feeds/rss\n';
  const existing = existsSync('CHANGELOG.md')
    ? readFileSync('CHANGELOG.md', 'utf8').replace(/^# Changelog[\s\S]*?\n(?=## |$)/, '')
    : '';
  writeFileSync('CHANGELOG.md', `${header}\n${section}\n${existing}`);
}

// ---------- refresh README stats block ----------

const byType = {};
const byCountry = {};
let verified = 0;
for (const e of entries) {
  byType[e.type] = (byType[e.type] ?? 0) + 1;
  if (e.country_code) byCountry[e.country_code] = (byCountry[e.country_code] ?? 0) + 1;
  if (e.verification_state === 'VERIFIED') verified++;
}
const stats = [
  `| Snapshot | ${snapshotDate} |`,
  `| Entries | ${entries.length} |`,
  ...Object.entries(byType).sort().map(([t, n]) => `| ${t} | ${n} |`),
  `| Verified | ${verified} |`,
  `| Countries | ${Object.keys(byCountry).length} |`,
].join('\n');
if (existsSync('README.md')) {
  const readme = readFileSync('README.md', 'utf8').replace(
    /(<!-- stats:start -->)[\s\S]*(<!-- stats:end -->)/,
    `$1\n| | |\n|---|---|\n${stats}\n$2`
  );
  writeFileSync('README.md', readme);
}

console.log(`Snapshot ${snapshotDate}: ${entries.length} entries (+${added.length} / -${removed.length} / ~${changed.length})`);
