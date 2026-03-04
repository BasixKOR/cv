#!/usr/bin/env bun
import path from "node:path";
import { readdir } from "node:fs/promises";

const BASE = path.resolve(import.meta.dir, "../../");
const REPOS_DIR = `${BASE}/data/commit-archive/repos`;
const OUTPUT_PATH = `${BASE}/COMMIT_ARCHIVE.md`;

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

interface TimelineEntry {
  date: string;
  milestone: string;
}

interface Analysis {
  tech_stack: string[];
  category: string;
  domain: string;
  difficulty: number;
  summary: string;
  timeline: TimelineEntry[];
}

interface RepoJson {
  name: string;
  description: string | null;
  languages: Record<string, number>;
  is_fork: boolean;
  commits: CommitRecord[];
  analysis?: Analysis;
}

// --- Category order ---

const CATEGORY_ORDER = [
  "Web Applications & Platforms",
  "Programming Languages & Compilers",
  "Developer Tools & Libraries",
  "Desktop Applications & System Tools",
  "AI/ML & Data Science",
  "Infrastructure & DevOps",
  "Game Development",
  "Korean Language & i18n",
  "Browser Extensions & Automation",
  "Mobile Development",
  "Knowledge Management & Content",
  "Open Source Contributions (Forks)",
  "Concepts & Planning-Only Projects",
  "Bug Reproductions & Test Projects",
];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Very High",
  5: "Extreme",
};

// --- Helpers ---

function formatPeriod(commits: CommitRecord[]): string {
  if (commits.length === 0) return "N/A";
  const dates = commits.map((c) => c.date).sort();
  const first = dates[0].slice(0, 7); // YYYY-MM
  const last = dates[dates.length - 1].slice(0, 7);
  if (first === last) return first;
  return `${first} ~ ${last}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-/]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
}

// --- Main ---

const files = await readdir(REPOS_DIR);
const repoFiles = files.filter((f) => f.endsWith(".json"));

// Load all repos
const allRepos: RepoJson[] = [];
for (const f of repoFiles) {
  const repo: RepoJson = await Bun.file(`${REPOS_DIR}/${f}`).json();
  allRepos.push(repo);
}

// Filter to repos with analysis
const analyzedRepos = allRepos.filter((r) => r.analysis);

// Group by category
const byCategory = new Map<string, RepoJson[]>();
for (const repo of analyzedRepos) {
  const cat = repo.analysis!.category;
  if (!byCategory.has(cat)) byCategory.set(cat, []);
  byCategory.get(cat)!.push(repo);
}

// Sort repos within each category by commit count desc
for (const repos of byCategory.values()) {
  repos.sort((a, b) => b.commits.length - a.commits.length);
}

// Count totals
const totalRepos = allRepos.length;
const totalCommits = allRepos.reduce((sum, r) => sum + r.commits.length, 0);

// --- Render ---

const lines: string[] = [];
const w = (line: string) => lines.push(line);

w(`# RanolP GitHub Commit Archive`);
w("");
w(
  `> **${totalRepos} repositories** | **~${totalCommits.toLocaleString()} commits** | Generated ${new Date().toISOString().slice(0, 10)}`
);
w("");
w("---");
w("");

// Table of contents
w("## Table of Contents");
w("");
let tocIdx = 1;
for (const cat of CATEGORY_ORDER) {
  if (!byCategory.has(cat)) continue;
  w(`${tocIdx}. [${cat}](#${slugify(cat)})`);
  tocIdx++;
}
w("");
w("---");
w("");

// Category sections
for (const cat of CATEGORY_ORDER) {
  const repos = byCategory.get(cat);
  if (!repos) continue;

  w(`## ${cat}`);
  w("");

  for (const repo of repos) {
    const a = repo.analysis!;
    const displayName = repo.name;

    w(`### ${displayName}`);
    w("| | |");
    w("|---|---|");
    w(`| **Period** | ${formatPeriod(repo.commits)} |`);
    w(`| **Commits** | ${repo.commits.length} |`);
    w(`| **Tech Stack** | ${a.tech_stack.join(", ")} |`);
    w(`| **Category** | ${a.category} |`);
    w(`| **Domain** | ${a.domain} |`);
    w(
      `| **Difficulty** | ${DIFFICULTY_LABELS[a.difficulty] ?? a.difficulty} |`
    );
    w("");
    w(a.summary);
    w("");

    if (a.timeline.length > 0) {
      w("**Timeline:**");
      for (const t of a.timeline) {
        w(`- \`${t.date}\` ${t.milestone}`);
      }
      w("");
    }

    w("---");
    w("");
  }
}

// Summary statistics
w("## Summary Statistics");
w("");

// By year
const byYear = new Map<number, { repos: Set<string>; commits: number }>();
for (const repo of allRepos) {
  for (const c of repo.commits) {
    const year = new Date(c.date).getFullYear();
    if (!byYear.has(year))
      byYear.set(year, { repos: new Set(), commits: 0 });
    const entry = byYear.get(year)!;
    entry.repos.add(repo.name);
    entry.commits++;
  }
}
w("### By Year");
w("");
w("| Year | Active Repos | Commits |");
w("|---|---|---|");
for (const year of [...byYear.keys()].sort()) {
  const entry = byYear.get(year)!;
  w(`| ${year} | ${entry.repos.size} | ${entry.commits.toLocaleString()} |`);
}
w("");

// Tech stack distribution
if (analyzedRepos.length > 0) {
  const techCounts = new Map<string, number>();
  for (const repo of analyzedRepos) {
    for (const tech of repo.analysis!.tech_stack) {
      techCounts.set(tech, (techCounts.get(tech) ?? 0) + 1);
    }
  }
  const topTech = [...techCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  w("### Primary Tech Stack Distribution");
  w("");
  w("| Technology | Projects |");
  w("|---|---|");
  for (const [tech, count] of topTech) {
    w(`| **${tech}** | ${count} |`);
  }
  w("");

  // Difficulty distribution
  const diffCounts = new Map<number, number>();
  for (const repo of analyzedRepos) {
    const d = repo.analysis!.difficulty;
    diffCounts.set(d, (diffCounts.get(d) ?? 0) + 1);
  }
  w("### Difficulty Distribution");
  w("");
  w("| Level | Count |");
  w("|---|---|");
  for (const d of [5, 4, 3, 2, 1]) {
    if (diffCounts.has(d)) {
      w(`| ${DIFFICULTY_LABELS[d]} | ${diffCounts.get(d)} |`);
    }
  }
  w("");
}

const output = lines.join("\n") + "\n";
await Bun.write(OUTPUT_PATH, output);

const lineCount = lines.length;
console.log(`Rendered COMMIT_ARCHIVE.md: ${lineCount} lines, ${analyzedRepos.length} analyzed repos out of ${totalRepos} total`);
