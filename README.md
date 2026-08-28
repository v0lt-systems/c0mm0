# Commodity — European Public-Data Catalog Snapshots

Nightly snapshots of the [Commodity](https://c0mm0.com) catalog: continuously
verified **official public-sector APIs and datasets** from Europe and beyond.
Every entry is uptime-checked every 15 minutes and re-verified every 6 hours by
the live directory; this repo is the downloadable, versioned mirror of that
catalog.

<!-- stats:start -->
| | |
|---|---|
| Snapshot | 2026-08-28 |
| Entries | 13691 |
| API | 10579 |
| DATASET | 3112 |
| Verified | 11942 |
| Countries | 34 |
<!-- stats:end -->

## Files

| File | Format | Best for |
|---|---|---|
| [`data/entries.json`](data/entries.json) | JSON | programmatic use, jq |
| [`data/entries.csv`](data/entries.csv) | CSV | spreadsheets, pandas |
| [`data/commodity.sqlite`](data/commodity.sqlite) | SQLite | SQL queries, [Datasette](https://datasette.io) |

Weekly tagged [Releases](../../releases) carry the same files plus release
notes listing what changed, so you can pin a version.

## Quick start

```bash
# SQL over the whole catalog, no server needed
sqlite3 data/commodity.sqlite \
  "SELECT country_code, COUNT(*) FROM entries WHERE type='API' GROUP BY 1 ORDER BY 2 DESC LIMIT 10"

# All verified French APIs, as JSON
jq '.entries[] | select(.country_code=="FR" and .verification_state=="VERIFIED") | {name, homepage_url}' data/entries.json
```

Fresher than nightly? Use the live API — no key required:

```
https://c0mm0.com/api/v1/entries?country=FR&type=API
https://c0mm0.com/api/v1/entries/search?q=company+registry
https://c0mm0.com/openapi.json
```

## Field reference

Each entry: `id`, `name`, `slug`, `type` (API | DATASET), `description`,
`country_code` (ISO 3166-1 alpha-2), `homepage_url`, `docs_url`, `repo_url`,
`free_access_class`, `auth_type`, `status`, `verification_state`
(VERIFIED | STALE | FAILING | UNVERIFIED), `tags`, `created_at`, `updated_at`,
`last_verified_at`.

Richer per-entry data — provenance, quality scores, rate limits, latency
history — lives behind the live API:
`https://c0mm0.com/api/v1/entries/{slug}/quality-score` and the entry pages
(`https://c0mm0.com/entry/{slug}`), each of which embeds a schema.org/Dataset
JSON-LD record.

## How to cite

> Commodity — Verified Official Data Directory. https://c0mm0.com
> Snapshot: github.com/v0lt-systems/c0mm0 (release tag), CC0-1.0.

Stable per-entry citation URLs: `https://c0mm0.com/entry/{slug}`.

## Contributing

Spotted a missing API, a wrong field, or a dead link? See
[CONTRIBUTING.md](CONTRIBUTING.md) — corrections flow into the live
directory's review pipeline, and land back here with the next snapshot.

## License

Catalog metadata is [CC0-1.0](LICENSE) — use it for anything, no attribution
required (though a link to https://c0mm0.com is appreciated). The upstream
APIs and datasets described by the catalog carry their publishers' own
licenses; check each entry's source.
