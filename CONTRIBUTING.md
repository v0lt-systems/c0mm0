# Contributing

This repository is a **generated mirror** — the files under `data/` are
rebuilt nightly from the live directory, so pull requests that edit the data
files directly would be overwritten by the next snapshot.

Instead, corrections and additions go to the live directory and flow back
here automatically:

## Suggest a new API or dataset

Submit it at **https://c0mm0.com/submit** (name, URL, and country are enough —
the pipeline extracts the rest and a human reviews it), or open an issue here
using the *New entry* template with the same details.

## Report a wrong field, dead link, or missing metadata

Open an issue here with the entry's `slug` and what's wrong. Issues are
triaged into the directory's review queue.

## Improve the snapshot tooling

PRs to `scripts/` and `.github/workflows/` are welcome — that part is not
generated.

Every accepted change reaches the live site after review and appears in this
repo with the next nightly snapshot (and in the weekly release notes).
