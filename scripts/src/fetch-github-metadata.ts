#!/usr/bin/env bun
import { $ } from "bun";
import path from "node:path";

$.cwd(path.resolve(import.meta.dir, "../../"));
await $`mkdir -p assets/.automatic/github/`;

function computeExpiredAt(state: string): string {
  if (state === "MERGED") return "Infinity";
  const baseDays = state === "OPEN" ? 7 : 30;
  const jitterDays = (Math.random() - 0.5) * 2; // ±1 day
  const ms = Date.now() + (baseDays + jitterDays) * 86400_000;
  return new Date(ms).toISOString();
}

function isExpired(entry: { expiredAt?: string }): boolean {
  if (!entry.expiredAt) return true;
  if (entry.expiredAt === "Infinity") return false;
  return new Date(entry.expiredAt).getTime() <= Date.now();
}

// pull

const pulls: Array<string> =
  await $`typst query resume.typ '<github-pull>' --field value`.json();

let existingPulls: Record<string, any> = {};
try {
  existingPulls = await Bun.file("assets/.automatic/github/pull.json").json();
} catch {}

const stalePulls = pulls.filter(
  (pull) => !existingPulls[pull] || isExpired(existingPulls[pull])
);
const freshPulls = pulls.filter(
  (pull) => existingPulls[pull] && !isExpired(existingPulls[pull])
);

const pullResults = await Promise.all(
  stalePulls.map(async (pull) => {
    console.log(`Loading PR ${pull}`);
    const {
      number,
      state,
      title,
      updatedAt: updatedAtString,
    } = await $`gh pr view ${pull} --json number,state,title,updatedAt`.json();
    const updatedAt = new Date(updatedAtString);
    return [
      pull,
      {
        number,
        state,
        title,
        nameWithOwner: /\/([^/]+\/[^/]+)\/pull\/\d+$/.exec(pull)![1],
        updatedAt: {
          year: updatedAt.getUTCFullYear(),
          month: updatedAt.getUTCMonth() + 1,
          day: updatedAt.getUTCDate(),
        },
        expiredAt: computeExpiredAt(state),
      },
    ] as const;
  })
);

const pullData: Record<string, unknown> = {};
for (const pull of freshPulls) {
  pullData[pull] = existingPulls[pull];
}
for (const [url, data] of pullResults) {
  pullData[url] = data;
}

await $`echo ${JSON.stringify(pullData)} > assets/.automatic/github/pull.json`;

// issue

const issues: Array<string> =
  await $`typst query resume.typ '<github-issue>' --field value`.json();

let existingIssues: Record<string, any> = {};
try {
  existingIssues = await Bun.file(
    "assets/.automatic/github/issue.json"
  ).json();
} catch {}

const staleIssues = issues.filter(
  (issue) => !existingIssues[issue] || isExpired(existingIssues[issue])
);
const freshIssues = issues.filter(
  (issue) => existingIssues[issue] && !isExpired(existingIssues[issue])
);

const issueResults = await Promise.all(
  staleIssues.map(async (issue) => {
    console.log(`Loading Issue ${issue}`);
    const {
      number,
      state,
      title,
      updatedAt: updatedAtString,
    } = await $`gh issue view ${issue} --json number,state,title,updatedAt`.json();
    const updatedAt = new Date(updatedAtString);
    return [
      issue,
      {
        number,
        state,
        title,
        nameWithOwner: /\/([^/]+\/[^/]+)\/issues\/\d+$/.exec(issue)![1],
        updatedAt: {
          year: updatedAt.getUTCFullYear(),
          month: updatedAt.getUTCMonth() + 1,
          day: updatedAt.getUTCDate(),
        },
        expiredAt: computeExpiredAt(state),
      },
    ] as const;
  })
);

const issueData: Record<string, unknown> = {};
for (const issue of freshIssues) {
  issueData[issue] = existingIssues[issue];
}
for (const [url, data] of issueResults) {
  issueData[url] = data;
}

await $`echo ${JSON.stringify(issueData)} > assets/.automatic/github/issue.json`;

if (stalePulls.length === 0 && staleIssues.length === 0) {
  console.log("All entries are cached and fresh, nothing to fetch.");
} else {
  console.log(
    `Fetched ${stalePulls.length} PRs, ${staleIssues.length} issues (skipped ${freshPulls.length} cached PRs, ${freshIssues.length} cached issues).`
  );
}
