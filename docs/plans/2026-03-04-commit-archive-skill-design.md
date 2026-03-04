# Commit Archive Skill Design

## Problem

Archiving all GitHub commits into a structured, categorized document (COMMIT_ARCHIVE.md) currently requires a full manual session: fetching ~3,875 commits across 93 repos, analyzing file changes, tagging metadata, and writing summaries. This is expensive in tokens and time, and not repeatable.

## Goals

- **Incremental**: Only fetch and analyze what changed since last run
- **Predictable**: Scripts handle all GitHub I/O; Claude only analyzes deltas
- **Token-efficient**: Reusable scripts eliminate repeated API fetching from context
- **Reproducible**: JSON source of truth renders to Markdown deterministically

## Architecture

```
scripts/src/
  fetch-commits.ts          # Phase 1: Fetch new commits per repo
  fetch-file-changes.ts     # Phase 2: Fetch file-level diffs for new commits
  render-archive.ts         # Phase 4: Generate COMMIT_ARCHIVE.md from JSON

data/commit-archive/
  state.json                # Cursors, timestamps, repo metadata index
  repos/{repo-name}.json    # Per-repo: commits, languages, analysis

COMMIT_ARCHIVE.md           # Rendered output (generated, not hand-edited)

.claude/skills/commit-archive/
  SKILL.md                  # Skill definition instructing Claude on workflow
```

## Data Model

### `state.json`

```json
{
  "github_user": "RanolP",
  "last_run": "2026-03-04T23:15:00Z",
  "repos": {
    "watch.ranolp.dev": {
      "last_sha": "abc1234",
      "last_fetched": "2026-03-04T23:15:00Z",
      "commit_count": 732
    }
  }
}
```

### `repos/{name}.json`

```json
{
  "name": "watch.ranolp.dev",
  "description": "Music voting/listening data aggregation",
  "languages": { "TypeScript": 12345, "HTML": 3456 },
  "is_fork": false,
  "commits": [
    {
      "sha": "abc1234",
      "date": "2025-01-22T10:00:00Z",
      "message": "fix type errors",
      "files": [
        { "path": "src/index.ts", "additions": 10, "deletions": 5 }
      ]
    }
  ],
  "analysis": {
    "tech_stack": ["TypeScript", "D3", "GitHub Actions"],
    "category": "Web Application",
    "domain": "Music data aggregation",
    "difficulty": 3,
    "summary": "A music voting/listening data aggregation platform...",
    "timeline": [
      { "date": "2024-12-04", "milestone": "Initial build with typesafe data" }
    ]
  }
}
```

**Conventions:**
- Commits without `files` field: need file-change fetching
- Repos without `analysis` field: need Claude analysis
- Repos where newest commit is newer than analysis timestamp: need re-analysis

## Scripts

### `fetch-commits.ts`

1. Read `state.json` for per-repo cursors
2. Discover repos: `gh repo list RanolP --json name,isFork,description --limit 200`
3. For each repo, fetch commits since cursor using `gh api` with `--paginate`
4. Merge new commits into `repos/{name}.json`, preserving existing data
5. Update cursors in `state.json`
6. **Output**: Print summary — "Fetched X new commits across Y repos" + list of changed repo names

### `fetch-file-changes.ts`

1. Scan `repos/*.json` for commits missing `files` data
2. For each such commit, fetch via `gh api repos/RanolP/{repo}/commits/{sha}`
3. Sampling strategy for repos with >30 pending commits: first 5 + every 10th + last 5
4. Update commit entries in-place with file stats
5. **Output**: Print summary of repos and commit counts processed

### `render-archive.ts`

1. Read all `repos/*.json` files
2. Group repos by `analysis.category`
3. Render COMMIT_ARCHIVE.md following the current format (TOC, per-category sections, per-project entries with metadata table + summary + timeline)
4. Write to repo root
5. **Output**: Print file path and line count

All scripts are idempotent and safe to re-run.

## Skill Workflow

The skill (`SKILL.md`) prescribes this 5-phase workflow:

1. **Fetch** — `bun scripts/src/fetch-commits.ts`
   Read output to identify which repos have new commits.

2. **Detail** — `bun scripts/src/fetch-file-changes.ts`
   Read output to see what file data was collected.

3. **Analyze** — Claude reads repos with missing/stale `analysis`.
   For each, read the repo JSON, analyze commits + file changes, write updated analysis back.
   Only repos with new data since last analysis are touched.

4. **Render** — `bun scripts/src/render-archive.ts`
   Regenerate COMMIT_ARCHIVE.md from JSON.

5. **Verify** — Read generated MD, confirm correctness.

## Token Efficiency

| Phase | Who | Token cost |
|-------|-----|-----------|
| Fetch commits | Script | 0 (shell only) |
| Fetch file changes | Script | 0 (shell only) |
| Analyze changed repos | Claude | Proportional to # changed repos |
| Render markdown | Script | 0 (shell only) |
| Verify output | Claude | ~1 read of final MD |

On a typical incremental run with 2-3 changed repos, Claude only needs to read/write those repo JSONs — not the entire archive.

## Decisions

- **JSON over TSV**: Structured data supports typed analysis fields, nested commits/files, and is easier to merge incrementally.
- **Per-repo files over monolith**: Git diffs are cleaner, parallel script execution is possible, and large repos don't bloat small ones.
- **Scripts in Bun/TS**: Matches existing `scripts/src/` patterns in this repo.
- **Sampling for file changes**: Repos with 30+ unanalyzed commits get sampled to avoid GitHub API rate limits while still capturing representative changes.
