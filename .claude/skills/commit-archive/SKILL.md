---
name: commit-archive
description: Use when updating, refreshing, or generating the GitHub commit archive (COMMIT_ARCHIVE.md). Handles incremental fetching, analysis of changed repos, and markdown rendering.
---

# Commit Archive

Incrementally update the GitHub commit archive. Scripts handle all API I/O; you analyze only repos with new data.

## Workflow

### Phase 1: Fetch

```bash
bun scripts/src/fetch-commits.ts
```

Read output. It lists repos with new commits.

### Phase 2: Detail

```bash
bun scripts/src/fetch-file-changes.ts
```

Read output. It lists commits that got file-change data.

### Phase 3: Analyze

For each repo listed as changed in Phase 1:

1. Read `data/commit-archive/repos/{owner}__{name}.json`
2. Look at commits and their file changes
3. Write or update the `analysis` field:
   - `tech_stack`: string[] — from actual file extensions and contents
   - `category`: one of the categories below
   - `domain`: specific domain description
   - `difficulty`: 1-5 (1=Low, 2=Medium, 3=High, 4=Very High, 5=Extreme)
   - `summary`: 1-3 sentences from actual changes
   - `timeline`: array of `{ date, milestone }` key events
4. Write updated JSON back

Skip repos where `analysis` exists and no new commits arrived.

### Phase 4: Render

```bash
bun scripts/src/render-archive.ts
```

### Phase 5: Verify

Read first 30 and last 30 lines of COMMIT_ARCHIVE.md to confirm.

## Categories

Use these exact names for `analysis.category`:
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

| Value | Label | Criteria |
|-------|-------|----------|
| 1 | Low | README-only, config, single concept |
| 2 | Medium | Working app with standard patterns |
| 3 | High | Custom architecture, multiple integrations |
| 4 | Very High | Novel systems (compilers, AI pipelines, custom frameworks) |
| 5 | Extreme | Research-grade, multi-system orchestration |
