# Commit Archive Skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an incremental commit archive system with reusable Bun scripts and a Claude skill, so updating COMMIT_ARCHIVE.md is fast, predictable, and token-efficient.

**Architecture:** Three Bun/TypeScript scripts handle GitHub API I/O (fetch-commits, fetch-file-changes, render-archive). JSON files in `data/commit-archive/` are the source of truth. A project-local Claude skill orchestrates: scripts fetch, Claude analyzes deltas only, script renders.

**Tech Stack:** Bun, TypeScript, `gh` CLI, JSON, Markdown

---

### Task 1: Create data directory and state.json schema

**Files:**
- Create: `data/commit-archive/state.json`
- Create: `data/commit-archive/repos/.gitkeep`

**Step 1: Create directory structure**

```bash
mkdir -p data/commit-archive/repos
```

**Step 2: Write initial state.json**

Create `data/commit-archive/state.json`:
```json
{
  "github_user": "RanolP",
  "since": "2023-01-01T00:00:00Z",
  "last_run": null,
  "repos": {}
}
```

**Step 3: Add .gitkeep for empty repos dir**

```bash
touch data/commit-archive/repos/.gitkeep
```

**Step 4: Commit**

```bash
git add data/commit-archive/state.json data/commit-archive/repos/.gitkeep
git commit -m "feat: add commit-archive data directory with initial state"
```

---

### Task 2: Write fetch-commits.ts

**Files:**
- Create: `scripts/src/fetch-commits.ts`
- Modify: `scripts/package.json` (add script entry)

**Step 1: Add script entry to package.json**

In `scripts/package.json`, add to `"scripts"`:
```json
"fetch-commits": "./src/fetch-commits.ts"
```

**Step 2: Write fetch-commits.ts**

Create `scripts/src/fetch-commits.ts` with shebang `#!/usr/bin/env bun`. The script must:

1. Read `data/commit-archive/state.json`
2. Run `gh repo list RanolP --source --json name,isFork,description --limit 300` to discover all repos (non-fork + fork, `--source` is default but be explicit with separate fork call)
   - Also run `gh repo list RanolP --fork --json name,isFork,description --limit 100` for forks
3. For each repo:
   - Look up cursor from `state.repos[name].last_sha`
   - If cursor exists, fetch commits since: `gh api "repos/RanolP/{name}/commits?author=RanolP&since={last_fetched}&per_page=100" --paginate`
   - If no cursor, fetch all since `state.since`: `gh api "repos/RanolP/{name}/commits?author=RanolP&since={state.since}&per_page=100" --paginate`
   - Handle 409 (empty repo) and 404 gracefully — skip with a warning
4. For each repo with new commits:
   - Read existing `data/commit-archive/repos/{name}.json` if it exists
   - Merge new commits (by SHA, no duplicates), sorted by date descending
   - Update `description`, `is_fork` from discovery
   - Fetch languages: `gh api repos/RanolP/{name}/languages`
   - Write updated repo JSON
5. Update `state.json`: set `last_run`, update per-repo `last_sha` and `last_fetched` and `commit_count`
6. Print to stdout:
   ```
   Fetched {total} new commits across {count} repos
   Changed repos:
     {name}: +{new_count} commits ({total} total)
     ...
   ```

Key implementation details:
- Use `Bun.$` for shell commands following existing pattern in `fetch-github-metadata.ts`
- Use `path.resolve(import.meta.dir, "../../")` as base dir (same as existing scripts)
- Wrap gh API calls in try/catch — empty repos return 409, some return 5xx
- Commit format in repo JSON: `{ sha, date, message }` (no files yet)
- Rate limit: add 50ms delay between API calls to avoid GitHub throttling

**Step 3: Test manually**

```bash
cd /home/ranolp/Projects/RanolP/resume && bun scripts/src/fetch-commits.ts
```

Expected: prints summary of fetched commits, creates JSON files in `data/commit-archive/repos/`, updates `state.json`.

**Step 4: Verify state.json was updated**

```bash
cat data/commit-archive/state.json | head -20
ls data/commit-archive/repos/ | head -20
cat data/commit-archive/repos/resume.json | head -30
```

Expected: `state.json` has `last_run` set, repos directory has JSON files, each has commits array.

**Step 5: Commit**

```bash
git add scripts/src/fetch-commits.ts scripts/package.json
git commit -m "feat: add fetch-commits script for incremental commit fetching"
```

---

### Task 3: Write fetch-file-changes.ts

**Files:**
- Create: `scripts/src/fetch-file-changes.ts`
- Modify: `scripts/package.json` (add script entry)

**Step 1: Add script entry to package.json**

In `scripts/package.json`, add to `"scripts"`:
```json
"fetch-file-changes": "./src/fetch-file-changes.ts"
```

**Step 2: Write fetch-file-changes.ts**

Create `scripts/src/fetch-file-changes.ts` with shebang `#!/usr/bin/env bun`. The script must:

1. Read all `data/commit-archive/repos/*.json` files
2. For each repo, find commits where `files` field is undefined/null
3. Sampling strategy:
   - If pending count <= 30: fetch all
   - If pending count > 30: take first 5, every 10th from middle, last 5
4. For each selected commit:
   - `gh api repos/RanolP/{name}/commits/{sha}` to get file details
   - Extract `files` array: `[{ path, additions, deletions }]`
   - Update commit entry in repo JSON with `files` field
   - Add 50ms delay between API calls
5. Handle errors gracefully (some commits may 404 if repo was renamed/deleted)
6. Write updated repo JSONs
7. Print summary:
   ```
   Fetched file changes for {total} commits across {count} repos
     {name}: {fetched}/{pending} commits detailed ({skipped} sampled out)
     ...
   ```

**Step 3: Test manually**

```bash
cd /home/ranolp/Projects/RanolP/resume && bun scripts/src/fetch-file-changes.ts
```

Expected: commits in repo JSONs now have `files` arrays.

**Step 4: Verify**

```bash
cat data/commit-archive/repos/resume.json | bun -e "const d=await Bun.file(process.argv[1]??'/dev/stdin').json();console.log(d.commits[0])" data/commit-archive/repos/resume.json
```

Expected: first commit has `files` array with path/additions/deletions.

**Step 5: Commit**

```bash
git add scripts/src/fetch-file-changes.ts scripts/package.json
git commit -m "feat: add fetch-file-changes script for commit detail fetching"
```

---

### Task 4: Write render-archive.ts

**Files:**
- Create: `scripts/src/render-archive.ts`
- Modify: `scripts/package.json` (add script entry)

**Step 1: Add script entry to package.json**

In `scripts/package.json`, add to `"scripts"`:
```json
"render-archive": "./src/render-archive.ts"
```

**Step 2: Write render-archive.ts**

Create `scripts/src/render-archive.ts` with shebang `#!/usr/bin/env bun`. The script must:

1. Read all `data/commit-archive/repos/*.json` files
2. Filter to repos that have `analysis` field (skip unanalyzed repos)
3. Group repos by `analysis.category`
4. Define category order (matching current COMMIT_ARCHIVE.md):
   ```
   Web Applications & Platforms
   Programming Languages & Compilers
   Developer Tools & Libraries
   Desktop Applications & System Tools
   AI/ML & Data Science
   Infrastructure & DevOps
   Game Development
   Korean Language & i18n
   Browser Extensions & Automation
   Mobile Development
   Knowledge Management & Content
   Open Source Contributions (Forks)
   Concepts & Planning-Only Projects
   Bug Reproductions & Test Projects
   ```
5. Render markdown matching current format:
   - Header with repo count, commit count, generation timestamp
   - Table of contents
   - Per-category sections with per-project entries:
     - Metadata table (Period, Commits, Tech Stack, Category, Domain, Difficulty)
     - Summary paragraph
     - Timeline bullet points
   - Summary statistics at bottom (by year, tech stack, domain, difficulty)
6. Write to `COMMIT_ARCHIVE.md` at repo root
7. Print: `Rendered COMMIT_ARCHIVE.md: {lines} lines, {repos} repos`

Key: the render script reads `analysis` fields verbatim — it does not generate analysis. It's a pure data-to-markdown transform.

**Step 3: Test manually**

This won't produce useful output until some repos have `analysis` fields. For now, verify it runs without error and produces a valid (empty/skeleton) markdown:

```bash
cd /home/ranolp/Projects/RanolP/resume && bun scripts/src/render-archive.ts
```

**Step 4: Commit**

```bash
git add scripts/src/render-archive.ts scripts/package.json
git commit -m "feat: add render-archive script for JSON-to-markdown generation"
```

---

### Task 5: Seed data from existing COMMIT_ARCHIVE.md

**Files:**
- Create: `scripts/src/seed-archive.ts` (one-time migration script)

**Step 1: Write seed-archive.ts**

This is a one-time script that parses the existing COMMIT_ARCHIVE.md and populates `analysis` fields in repo JSONs that were created by fetch-commits.ts. This bridges the gap so we don't lose the existing analysis work.

The script must:
1. Read `COMMIT_ARCHIVE.md`
2. Parse each project section: extract repo name (heading), metadata table fields (tech_stack, category, domain, difficulty), summary paragraph, timeline bullets
3. For each parsed project, find matching `data/commit-archive/repos/{name}.json`
4. Write the `analysis` field into the repo JSON
5. Print summary of how many repos were seeded

This script is run once and can be deleted after. It does NOT need to be added to package.json.

**Step 2: Run seed**

```bash
cd /home/ranolp/Projects/RanolP/resume && bun scripts/src/seed-archive.ts
```

**Step 3: Verify render produces equivalent output**

```bash
bun scripts/src/render-archive.ts
diff <(git show HEAD:COMMIT_ARCHIVE.md) COMMIT_ARCHIVE.md | head -50
```

Expected: output should be structurally similar (small formatting differences are OK).

**Step 4: Commit data files**

```bash
git add data/commit-archive/
git commit -m "feat: seed commit-archive data from existing COMMIT_ARCHIVE.md"
```

---

### Task 6: Write the skill SKILL.md

**Files:**
- Create: `.claude/skills/commit-archive/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p .claude/skills/commit-archive
```

**Step 2: Write SKILL.md**

Create `.claude/skills/commit-archive/SKILL.md`:

```markdown
---
name: commit-archive
description: Use when updating, refreshing, or generating the GitHub commit archive (COMMIT_ARCHIVE.md). Handles incremental fetching, analysis of changed repos, and markdown rendering.
---

# Commit Archive

## Overview

Incrementally update the GitHub commit archive. Scripts handle all API I/O; you analyze only repos with new data.

## Workflow

### Phase 1: Fetch

Run from the repo root:

\`\`\`bash
cd scripts && bun src/fetch-commits.ts
\`\`\`

Read the output. It lists which repos have new commits.

### Phase 2: Detail

\`\`\`bash
cd scripts && bun src/fetch-file-changes.ts
\`\`\`

Read the output. It lists which commits got file-change data.

### Phase 3: Analyze

For each repo listed as changed in Phase 1:

1. Read `data/commit-archive/repos/{name}.json`
2. Look at the commits and their file changes
3. Write or update the `analysis` field with:
   - `tech_stack`: array of technologies from actual file extensions and contents
   - `category`: one of the 14 standard categories (see render script)
   - `domain`: specific domain description
   - `difficulty`: 1-5 integer (1=Low, 2=Medium, 3=High, 4=Very High, 5=Extreme)
   - `summary`: 1-3 sentence project description derived from actual changes
   - `timeline`: array of `{ date, milestone }` for key project events
4. Write updated JSON back

Only analyze repos where `analysis` is missing OR where new commits arrived since the analysis was written. Skip repos with no changes.

### Phase 4: Render

\`\`\`bash
cd scripts && bun src/render-archive.ts
\`\`\`

### Phase 5: Verify

Read the first 30 and last 30 lines of COMMIT_ARCHIVE.md to confirm it rendered correctly.

## Category Reference

Use these exact category names for `analysis.category`:
- Web Applications & Platforms
- Programming Languages & Compilers
- Developer Tools & Libraries
- Desktop Applications & System Tools
- AI/ML & Data Science
- Infrastructure & DevOps
- Game Development
- Korean Language & i18n
- Browser Extensions & Automation
- Mobile Development
- Knowledge Management & Content
- Open Source Contributions (Forks)
- Concepts & Planning-Only Projects
- Bug Reproductions & Test Projects

## Difficulty Scale

| Level | Value | Criteria |
|-------|-------|----------|
| Low | 1 | README-only, config, single concept |
| Medium | 2 | Working app with standard patterns |
| High | 3 | Custom architecture, multiple integrations |
| Very High | 4 | Novel systems (compilers, AI pipelines, custom frameworks) |
| Extreme | 5 | Research-grade, multi-system orchestration |
```

**Step 3: Commit**

```bash
git add .claude/skills/commit-archive/SKILL.md
git commit -m "feat: add commit-archive skill for incremental archive updates"
```

---

### Task 7: Add data/ to .gitignore selectively

**Files:**
- Modify: `.gitignore` (if exists, otherwise create)

**Step 1: Check current .gitignore**

```bash
cat .gitignore 2>/dev/null || echo "no .gitignore"
```

**Step 2: Ensure data/commit-archive/ is tracked but /tmp files aren't**

The `data/commit-archive/` directory SHOULD be committed (it's the source of truth). No .gitignore changes needed for it. But verify the repo JSON files aren't too large to commit:

```bash
du -sh data/commit-archive/repos/ data/commit-archive/state.json
```

If total is under 10MB, commit everything. If over, add large repos to `.gitignore` and document which ones.

**Step 3: Commit if changes needed**

```bash
git add .gitignore
git commit -m "chore: update gitignore for commit-archive data"
```

---

### Task 8: End-to-end test

**Step 1: Run full pipeline**

```bash
cd /home/ranolp/Projects/RanolP/resume
bun scripts/src/fetch-commits.ts
bun scripts/src/fetch-file-changes.ts
bun scripts/src/render-archive.ts
```

**Step 2: Verify output**

```bash
wc -l COMMIT_ARCHIVE.md
head -25 COMMIT_ARCHIVE.md
```

Expected: COMMIT_ARCHIVE.md is regenerated with all analyzed repos.

**Step 3: Verify incrementality**

Run fetch-commits.ts again immediately:

```bash
bun scripts/src/fetch-commits.ts
```

Expected: "Fetched 0 new commits across 0 repos" — no work to do.

**Step 4: Final commit**

```bash
git add data/commit-archive/ COMMIT_ARCHIVE.md
git commit -m "chore: update commit archive data and rendered output"
```
