#!/usr/bin/env bun
import { $ } from "bun";
import path from "node:path";
import { readdir } from "node:fs/promises";

$.cwd(path.resolve(import.meta.dir, "../../"));

const DATA_DIR = "data/commit-archive";
const REPOS_DIR = `${DATA_DIR}/repos`;
const CONCURRENCY = 5;
const MAX_ALL = 30; // fetch all if pending <= this, sample otherwise

// --- Types ---

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

interface CommitRecord {
  sha: string;
  date: string;
  message: string;
  files?: FileChange[];
}

interface RepoJson {
  name: string;
  description: string | null;
  languages: Record<string, number>;
  is_fork: boolean;
  commits: CommitRecord[];
  analysis?: unknown;
}

// --- Helpers ---

async function parallel<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/** Sample commits: first 5 + every 10th from middle + last 5 */
function sampleIndices(total: number): number[] {
  const indices = new Set<number>();
  // First 5
  for (let i = 0; i < Math.min(5, total); i++) indices.add(i);
  // Every 10th from middle
  for (let i = 5; i < total - 5; i += 10) indices.add(i);
  // Last 5
  for (let i = Math.max(0, total - 5); i < total; i++) indices.add(i);
  return [...indices].sort((a, b) => a - b);
}

// --- Main ---

const files = await readdir(REPOS_DIR);
const repoFiles = files.filter((f) => f.endsWith(".json"));

interface RepoSummary {
  name: string;
  fetched: number;
  pending: number;
  skipped: number;
}

const summaries: RepoSummary[] = [];
let totalFetched = 0;

for (const filename of repoFiles) {
  const filePath = `${REPOS_DIR}/${filename}`;
  const repo: RepoJson = await Bun.file(filePath).json();

  // Find commits missing files data
  const pendingIndices: number[] = [];
  for (let i = 0; i < repo.commits.length; i++) {
    if (repo.commits[i].files === undefined) {
      pendingIndices.push(i);
    }
  }

  if (pendingIndices.length === 0) continue;

  // Decide which to fetch
  let toFetchIndices: number[];
  let skipped: number;
  if (pendingIndices.length <= MAX_ALL) {
    toFetchIndices = pendingIndices;
    skipped = 0;
  } else {
    const sampled = sampleIndices(pendingIndices.length);
    toFetchIndices = sampled.map((si) => pendingIndices[si]);
    skipped = pendingIndices.length - toFetchIndices.length;
    // Mark non-sampled commits with empty files array so we don't re-fetch
    for (const idx of pendingIndices) {
      if (!toFetchIndices.includes(idx)) {
        repo.commits[idx].files = [];
      }
    }
  }

  // Extract owner/name from repo.name (nameWithOwner format)
  const nwo = repo.name;

  // Fetch file changes in parallel
  const results = await parallel(
    toFetchIndices,
    async (commitIdx) => {
      const commit = repo.commits[commitIdx];
      try {
        const result =
          await $`gh api repos/${nwo}/commits/${commit.sha}`.nothrow().quiet();
        if (result.exitCode !== 0) {
          console.error(`  [WARN] ${nwo} ${commit.sha.slice(0, 8)}: API error`);
          return { idx: commitIdx, files: [] as FileChange[] };
        }
        const data: {
          files?: Array<{ filename: string; additions: number; deletions: number }>;
        } = result.json();
        const fileChanges: FileChange[] = (data.files ?? []).map((f) => ({
          path: f.filename,
          additions: f.additions,
          deletions: f.deletions,
        }));
        return { idx: commitIdx, files: fileChanges };
      } catch {
        return { idx: commitIdx, files: [] as FileChange[] };
      }
    },
    CONCURRENCY
  );

  // Apply results
  let fetched = 0;
  for (const { idx, files } of results) {
    repo.commits[idx].files = files;
    fetched++;
  }

  await Bun.write(filePath, JSON.stringify(repo, null, 2) + "\n");

  console.error(
    `  ${nwo}: ${fetched}/${pendingIndices.length} commits detailed` +
      (skipped > 0 ? ` (${skipped} sampled out)` : "")
  );
  summaries.push({
    name: nwo,
    fetched,
    pending: pendingIndices.length,
    skipped,
  });
  totalFetched += fetched;
}

// Print summary
const repoCount = summaries.length;
console.log(
  `Fetched file changes for ${totalFetched} commits across ${repoCount} repos`
);
if (summaries.length > 0) {
  for (const s of summaries) {
    console.log(
      `  ${s.name}: ${s.fetched}/${s.pending} commits detailed` +
        (s.skipped > 0 ? ` (${s.skipped} sampled out)` : "")
    );
  }
}
