#!/usr/bin/env bun
import { $ } from "bun";
import path from "node:path";

$.cwd(path.resolve(import.meta.dir, "../../"));

const DATA_DIR = "data/commit-archive";
const REPOS_DIR = `${DATA_DIR}/repos`;
const STATE_PATH = `${DATA_DIR}/state.json`;
const CONCURRENCY = 5;

// --- Types ---

interface StateJson {
  github_user: string;
  since: string;
  last_run: string | null;
  repos: Record<
    string,
    {
      last_sha: string;
      last_fetched: string;
      commit_count: number;
    }
  >;
}

interface RepoDiscovery {
  name: string;
  nameWithOwner: string;
  isFork: boolean;
  description: string | null;
}

interface CommitFromApi {
  sha: string;
  commit: {
    message: string;
    committer: { date: string };
    author: { date: string };
  };
}

interface CommitRecord {
  sha: string;
  date: string;
  message: string;
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

function firstLine(message: string): string {
  return message.split("\n")[0];
}

/** Run tasks in batches of `concurrency` */
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

/** Safely call gh api, returning null on error */
async function ghApi<T>(apiPath: string): Promise<T | null> {
  const result = await $`gh api ${apiPath} --paginate`.nothrow().quiet();
  if (result.exitCode !== 0) return null;
  return result.json() as T;
}

// --- Main ---

// Step 1: Read state.json
const state: StateJson = await Bun.file(STATE_PATH).json();
const githubUser = state.github_user;

// Step 2: Discover repos
console.error("Discovering repos...");

// 2a: Own repos
const [sourceRepos, forkRepos] = await Promise.all([
  $`gh repo list ${githubUser} --source --json name,nameWithOwner,isFork,description --limit 300`
    .json()
    .then((r: RepoDiscovery[]) => r),
  $`gh repo list ${githubUser} --fork --json name,nameWithOwner,isFork,description --limit 100`
    .json()
    .then((r: RepoDiscovery[]) => r),
]);
console.error(`  Own: ${sourceRepos.length} source + ${forkRepos.length} forks`);

// 2b: Org repos — only repos where user is a contributor
console.error("Discovering org repos (filtering by contributor)...");
interface OrgInfo {
  login: string;
}
const orgRepos: RepoDiscovery[] = [];
try {
  const orgs: OrgInfo[] = await $`gh api /user/orgs --paginate`.json();

  for (const org of orgs) {
    let allOrgRepos: RepoDiscovery[];
    try {
      allOrgRepos =
        await $`gh repo list ${org.login} --json name,nameWithOwner,isFork,description --limit 300`.json();
    } catch {
      console.error(`  [WARN] failed to list repos for ${org.login}`);
      continue;
    }

    // Check contributor status in parallel batches
    const contributedRepos = await parallel(
      allOrgRepos,
      async (repo) => {
        try {
          // Check if user is a contributor by fetching contributors list
          const contributors =
            await ghApi<Array<{ login: string }>>(
              `repos/${repo.nameWithOwner}/contributors?per_page=100`
            );
          if (
            contributors &&
            contributors.some(
              (c) => c.login.toLowerCase() === githubUser.toLowerCase()
            )
          ) {
            return repo;
          }
        } catch {
          // skip
        }
        return null;
      },
      CONCURRENCY
    );

    const filtered = contributedRepos.filter(
      (r): r is RepoDiscovery => r !== null
    );
    if (filtered.length > 0) {
      orgRepos.push(...filtered);
      console.error(
        `  ${org.login}: ${filtered.length}/${allOrgRepos.length} repos (contributor)`
      );
    }
  }
} catch {
  console.error("  [WARN] failed to list orgs");
}

// 2c: External repos contributed to via PRs (search API)
console.error("Discovering PR-contributed repos...");
const externalRepoSet = new Set<string>();
const knownOwners = new Set([
  githubUser.toLowerCase(),
  ...orgRepos.map((r) => r.nameWithOwner.split("/")[0].toLowerCase()),
]);
try {
  // gh search prs returns structured data
  const result =
    await $`gh search prs --author=${githubUser} --created=">=${state.since.slice(0, 10)}" --limit 200 --json repository`.nothrow().quiet();
  if (result.exitCode === 0) {
    const prs: Array<{ repository: { nameWithOwner: string } }> =
      result.json();
    for (const pr of prs) {
      const nwo = pr.repository.nameWithOwner;
      const owner = nwo.split("/")[0].toLowerCase();
      if (!knownOwners.has(owner)) {
        externalRepoSet.add(nwo);
      }
    }
  }
} catch (e) {
  console.error(`  [WARN] failed to search PRs: ${e}`);
}

const externalRepos: RepoDiscovery[] = await parallel(
  [...externalRepoSet],
  async (nwo) => {
    try {
      const info: { name: string; full_name: string; description: string | null } =
        await $`gh api repos/${nwo}`.json();
      console.error(`  PR-contributed: ${nwo}`);
      return {
        name: info.name,
        nameWithOwner: info.full_name,
        isFork: true, // treat external contributions as fork-like
        description: info.description,
      };
    } catch {
      console.error(`  [WARN] failed to fetch info for ${nwo}`);
      return null;
    }
  },
  CONCURRENCY
).then((results) => results.filter((r): r is RepoDiscovery => r !== null));

// Deduplicate by nameWithOwner
const allRepos = [...sourceRepos, ...forkRepos, ...orgRepos, ...externalRepos];
const seen = new Set<string>();
const dedupedRepos = allRepos.filter((r) => {
  if (seen.has(r.nameWithOwner)) return false;
  seen.add(r.nameWithOwner);
  return true;
});
console.error(
  `Total: ${dedupedRepos.length} repos (${sourceRepos.length} own-source, ${forkRepos.length} own-forks, ${orgRepos.length} org, ${externalRepos.length} PR-external)`
);

// Step 3 & 4: Fetch commits in parallel batches
interface FetchResult {
  name: string;
  newCount: number;
  totalCount: number;
}

const changedRepos: FetchResult[] = [];
let totalNewCommits = 0;

const fetchResults = await parallel(
  dedupedRepos,
  async (repo): Promise<FetchResult | null> => {
    const nwo = repo.nameWithOwner;
    const repoState = state.repos[nwo];
    const sinceDate = repoState?.last_fetched ?? state.since;

    const params = new URLSearchParams({
      author: githubUser,
      since: sinceDate,
      per_page: "100",
    });

    const rawCommits = await ghApi<CommitFromApi[]>(
      `repos/${nwo}/commits?${params}`
    );
    if (!rawCommits) {
      // Error already logged by ghApi returning null; detect specific errors
      const result =
        await $`gh api repos/${nwo}/commits?${params} --paginate`.nothrow().quiet();
      const stderr = result.stderr.toString();
      if (stderr.includes("409") || stderr.includes("empty")) {
        console.error(`  [SKIP] ${nwo}: empty repository`);
      } else if (stderr.includes("404")) {
        console.error(`  [SKIP] ${nwo}: not found`);
      } else if (stderr) {
        console.error(`  [ERROR] ${nwo}: ${stderr.trim().slice(0, 100)}`);
      }
      return null;
    }

    const newCommits: CommitRecord[] = rawCommits.map((c) => ({
      sha: c.sha,
      date: c.commit.author.date ?? c.commit.committer.date,
      message: firstLine(c.commit.message),
    }));

    if (newCommits.length === 0) return null;

    // Read existing repo JSON
    const safeFilename = nwo.replace("/", "__");
    const repoFilePath = `${REPOS_DIR}/${safeFilename}.json`;
    let existing: RepoJson | null = null;
    const repoFile = Bun.file(repoFilePath);
    if (await repoFile.exists()) {
      existing = await repoFile.json();
    }

    const existingShas = new Set(existing?.commits.map((c) => c.sha) ?? []);
    const dedupedNew = newCommits.filter((c) => !existingShas.has(c.sha));
    if (dedupedNew.length === 0) return null;

    const mergedCommits = [
      ...(existing?.commits ?? []),
      ...dedupedNew,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Fetch languages
    let languages: Record<string, number> = {};
    try {
      languages = await $`gh api repos/${nwo}/languages`.json();
    } catch {
      languages = existing?.languages ?? {};
    }

    const updatedRepo: RepoJson = {
      name: nwo,
      description: repo.description,
      languages,
      is_fork: repo.isFork,
      commits: mergedCommits,
    };
    if (existing?.analysis !== undefined) {
      updatedRepo.analysis = existing.analysis;
    }

    await Bun.write(repoFilePath, JSON.stringify(updatedRepo, null, 2) + "\n");

    console.error(
      `  ${nwo}: +${dedupedNew.length} commits (${mergedCommits.length} total)`
    );

    // Update state (will be written at the end)
    state.repos[nwo] = {
      last_sha: mergedCommits[0].sha,
      last_fetched: new Date().toISOString(),
      commit_count: mergedCommits.length,
    };

    return {
      name: nwo,
      newCount: dedupedNew.length,
      totalCount: mergedCommits.length,
    };
  },
  CONCURRENCY
);

for (const r of fetchResults) {
  if (r) {
    changedRepos.push(r);
    totalNewCommits += r.newCount;
  }
}

// Step 5: Write updated state.json
state.last_run = new Date().toISOString();
await Bun.write(STATE_PATH, JSON.stringify(state, null, 2) + "\n");

// Step 6: Print summary to stdout
console.log(
  `Fetched ${totalNewCommits} new commits across ${changedRepos.length} repos`
);
if (changedRepos.length > 0) {
  console.log("Changed repos:");
  for (const r of changedRepos) {
    console.log(`  ${r.name}: +${r.newCount} commits (${r.totalCount} total)`);
  }
}
