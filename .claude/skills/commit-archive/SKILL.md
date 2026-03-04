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

Process repos needing analysis (listed by fetch-commits, most recent first).
Skip repos where no new commits arrived since `analysis.analyzed_up_to`.

For each repo:

1. Read `data/commit-archive/repos/{owner}__{name}.json`
2. Find new commits (after `analysis.analyzed_up_to` SHA). Also include a few commits **before** the cursor as overlap context — work in progress may span across analysis sessions (e.g., a feature started last month, finished this month).
3. Group the visible commits by time period. Analyze each period as a batch — WIP commits together tell the story, not individually.
4. Merge into existing `analysis`:
   - `tech_stack`: union (add new, never remove)
   - `category`: one of the categories below (rarely changes)
   - `domain`: rarely changes
   - `difficulty`: 1-5 (can only increase)
   - `summary`: refine if new work is significant
   - `timeline`: append new milestones
   - `analyzed_up_to`: set to newest commit SHA
5. Write updated JSON back

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
