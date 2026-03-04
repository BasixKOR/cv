#!/usr/bin/env bun
/**
 * One-time seed script: parses existing COMMIT_ARCHIVE.md and populates
 * `analysis` fields in repo JSON files. Run once to bridge from the
 * manually generated archive to the structured JSON data.
 */
import path from "node:path";
import { readdir } from "node:fs/promises";

const BASE = path.resolve(import.meta.dir, "../../");
const REPOS_DIR = `${BASE}/data/commit-archive/repos`;
const ARCHIVE_PATH = `${BASE}/COMMIT_ARCHIVE.md`;

// --- Types ---

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
  commits: Array<unknown>;
  analysis?: Analysis;
}

const DIFFICULTY_MAP: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  "very high": 4,
  extreme: 5,
};

// --- Parse COMMIT_ARCHIVE.md ---

const md = await Bun.file(ARCHIVE_PATH).text();
const lines = md.split("\n");

// Current parsing state
let currentCategory = "";
let currentRepoName = "";
let currentMeta: Record<string, string> = {};
let currentSummaryLines: string[] = [];
let currentTimeline: TimelineEntry[] = [];
let inTimeline = false;

const analyses = new Map<string, { category: string; analysis: Analysis }>();

function flush() {
  if (!currentRepoName || !currentCategory) return;

  const techStack = currentMeta["Tech Stack"]
    ? currentMeta["Tech Stack"].split(",").map((s) => s.trim())
    : [];
  const domain = currentMeta["Domain"] ?? "";
  const diffStr = (currentMeta["Difficulty"] ?? "").toLowerCase();
  const difficulty = DIFFICULTY_MAP[diffStr] ?? 2;
  const summary = currentSummaryLines.join(" ").trim();

  if (!summary) return;

  // Use the category from the section heading, not from the metadata table
  analyses.set(currentRepoName, {
    category: currentCategory,
    analysis: {
      tech_stack: techStack,
      category: currentCategory,
      domain,
      difficulty,
      summary,
      timeline: currentTimeline,
    },
  });

  // Reset
  currentRepoName = "";
  currentMeta = {};
  currentSummaryLines = [];
  currentTimeline = [];
  inTimeline = false;
}

// Parse section-by-section
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Category heading (## ...)
  if (line.startsWith("## ") && !line.startsWith("### ")) {
    flush();
    const heading = line.slice(3).trim();
    if (
      heading !== "Table of Contents" &&
      heading !== "Summary Statistics"
    ) {
      currentCategory = heading;
    }
    continue;
  }

  // Repo heading (### ...)
  if (line.startsWith("### ")) {
    flush();
    currentRepoName = line.slice(4).trim();
    continue;
  }

  // Metadata table row
  if (line.startsWith("| **") && line.includes("** |")) {
    const match = line.match(/\| \*\*(.+?)\*\* \| (.+?) \|/);
    if (match) {
      currentMeta[match[1]] = match[2];
    }
    continue;
  }

  // Timeline
  if (line.startsWith("**Timeline:**")) {
    inTimeline = true;
    continue;
  }

  if (inTimeline && line.startsWith("- `")) {
    const match = line.match(/^- `(.+?)` (.+)$/);
    if (match) {
      currentTimeline.push({ date: match[1], milestone: match[2] });
    }
    continue;
  }

  if (inTimeline && !line.startsWith("- `") && line.trim() !== "") {
    inTimeline = false;
  }

  // Separator
  if (line === "---") {
    continue;
  }

  // Table header/separator rows
  if (line.startsWith("|---") || line.startsWith("| |")) {
    continue;
  }

  // Summary text (non-empty, non-table, non-heading line after metadata)
  if (
    currentRepoName &&
    Object.keys(currentMeta).length > 0 &&
    !inTimeline &&
    line.trim() !== "" &&
    !line.startsWith("|") &&
    !line.startsWith("#") &&
    !line.startsWith("**Timeline")
  ) {
    currentSummaryLines.push(line.trim());
  }
}
flush();

// --- Also parse table-based sections (Forks, Concepts, Bug Repros) ---

// Parse Forks table
const forksSection = md.match(
  /## Open Source Contributions \(Forks\)\n\n([\s\S]*?)(?=\n---|\n## )/
);
if (forksSection) {
  const tableLines = forksSection[1]
    .split("\n")
    .filter((l) => l.startsWith("| **"));
  for (const line of tableLines) {
    const match = line.match(
      /\| \*\*(.+?)\*\* \| (\d+) \| (.+?) \|/
    );
    if (match) {
      const name = match[1];
      analyses.set(name, {
        category: "Open Source Contributions (Forks)",
        analysis: {
          tech_stack: [],
          category: "Open Source Contributions (Forks)",
          domain: "Open source",
          difficulty: 2,
          summary: match[3],
          timeline: [],
        },
      });
    }
  }
}

// Parse Concepts table
const conceptsSection = md.match(
  /## Concepts & Planning-Only Projects\n\n[\s\S]*?\n\n([\s\S]*?)(?=\n---|\n## )/
);
if (conceptsSection) {
  const tableLines = conceptsSection[1]
    .split("\n")
    .filter((l) => l.startsWith("| **"));
  for (const line of tableLines) {
    const match = line.match(
      /\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \| (.+?) \|/
    );
    if (match) {
      analyses.set(match[1], {
        category: "Concepts & Planning-Only Projects",
        analysis: {
          tech_stack: [],
          category: "Concepts & Planning-Only Projects",
          domain: match[3],
          difficulty: 1,
          summary: match[4],
          timeline: [],
        },
      });
    }
  }
}

// Parse Bug Repros table
const bugSection = md.match(
  /## Bug Reproductions & Test Projects\n\n([\s\S]*?)(?=\n---|\n## |$)/
);
if (bugSection) {
  const tableLines = bugSection[1]
    .split("\n")
    .filter((l) => l.startsWith("| **"));
  for (const line of tableLines) {
    const match = line.match(
      /\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \| (.+?) \|/
    );
    if (match) {
      analyses.set(match[1], {
        category: "Bug Reproductions & Test Projects",
        analysis: {
          tech_stack: match[3].split(",").map((s) => s.trim()),
          category: "Bug Reproductions & Test Projects",
          domain: "Bug reproduction",
          difficulty: 1,
          summary: match[4],
          timeline: [],
        },
      });
    }
  }
}

console.log(`Parsed ${analyses.size} project analyses from COMMIT_ARCHIVE.md`);

// --- Match and write to repo JSONs ---

const repoFiles = (await readdir(REPOS_DIR)).filter((f) => f.endsWith(".json"));
let matched = 0;
let unmatched = 0;

for (const filename of repoFiles) {
  const filePath = `${REPOS_DIR}/${filename}`;
  const repo: RepoJson = await Bun.file(filePath).json();

  // repo.name is nameWithOwner like "RanolP/kati.nanno.space"
  const bareName = repo.name.split("/").pop()!;

  // Try to find analysis by bare name, or name with parenthetical
  let entry = analyses.get(bareName);
  if (!entry) {
    // Try matching names with parentheticals like "thote (Typlet)"
    for (const [key, val] of analyses) {
      if (key.startsWith(bareName + " ") || key.startsWith(bareName + "(")) {
        entry = val;
        analyses.delete(key);
        break;
      }
    }
  }
  if (entry) {
    repo.analysis = entry.analysis;
    await Bun.write(filePath, JSON.stringify(repo, null, 2) + "\n");
    matched++;
    analyses.delete(bareName);
  }
}

console.log(`Matched ${matched} repos, ${analyses.size} unmatched analyses`);
if (analyses.size > 0) {
  console.log("Unmatched:");
  for (const name of analyses.keys()) {
    console.log(`  ${name}`);
  }
}
