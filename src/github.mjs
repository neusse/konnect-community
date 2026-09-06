import { isAiRelated } from "./classify.mjs";

const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";

function requestHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "konnect-community-status",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubJson(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...requestHeaders(token),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function search(owner, repo, qualifier, token, perPage = 1) {
  const query = `repo:${owner}/${repo} ${qualifier}`;
  const url = new URL(`${GITHUB_API}/search/issues`);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(perPage));
  return githubJson(url, token);
}

async function pullRequests(owner, repo, token) {
  const query = `
    query KonnectPullRequests($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 100, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            number
            title
            url
            isDraft
            mergeable
            reviewDecision
            updatedAt
            labels(first: 20) {
              nodes { name }
            }
            commits(last: 1) {
              nodes {
                commit {
                  statusCheckRollup { state }
                }
              }
            }
          }
        }
      }
    }
  `;

  const body = await githubJson(GITHUB_GRAPHQL, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { owner, repo } }),
  });

  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL failed: ${JSON.stringify(body.errors)}`);
  }

  return body.data.repository.pullRequests.nodes;
}

function isoDateDaysAgo(now, days) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function collectSnapshot({ owner, repo, token, now = new Date() }) {
  const activeSince = isoDateDaysAgo(now, 14);
  const queries = {
    openIssues: "is:issue is:open",
    closedIssues: "is:issue is:closed",
    p0Issues: "is:issue is:open label:P0",
    claimedIssues: "is:issue is:open label:claimed",
    maintainerDecisionIssues:
      'is:issue is:open label:"needs:maintainer-decision"',
    activeIssues: `is:issue is:open updated:>=${activeSince}`,
    claudeIssuesOpen: 'is:issue is:open label:"client:claude"',
    claudeIssuesClosed: 'is:issue is:closed label:"client:claude"',
    codexIssuesOpen: 'is:issue is:open label:"client:codex"',
    codexIssuesClosed: 'is:issue is:closed label:"client:codex"',
    otherClientIssuesOpen: 'is:issue is:open label:"client:other"',
    otherClientIssuesClosed: 'is:issue is:closed label:"client:other"',
    agentGuidanceIssuesOpen: 'is:issue is:open label:"area:agent-guidance"',
    agentGuidanceIssuesClosed: 'is:issue is:closed label:"area:agent-guidance"',
    aiMaintainerDecisionIssues:
      'is:issue is:open label:"area:agent-guidance" label:"needs:maintainer-decision"',
    mergedPullRequests: "is:pr is:merged",
    closedUnmergedPullRequests: "is:pr is:closed is:unmerged",
  };

  const [counts, prs, release] = await Promise.all([
    Promise.all(
      Object.entries(queries).map(async ([key, qualifier]) => {
        const result = await search(owner, repo, qualifier, token);
        return [key, result.total_count];
      }),
    ).then(Object.fromEntries),
    pullRequests(owner, repo, token),
    githubJson(`${GITHUB_API}/repos/${owner}/${repo}/releases/latest`, token).catch(
      (error) => {
        if (String(error).includes("(404)")) return null;
        throw error;
      },
    ),
  ]);

  return {
    activeSince,
    counts,
    generatedAt: new Date(now).toISOString(),
    latestRelease: release
      ? { name: release.name ?? release.tag_name, tag: release.tag_name, url: release.html_url }
      : null,
    owner,
    pullRequests: prs,
    repo,
  };
}

export async function collectDailyActivity({ owner, repo, token, now = new Date() }) {
  const since = isoDateDaysAgo(now, 1);
  const queries = {
    openedIssues: `is:issue created:>=${since}`,
    closedIssues: `is:issue closed:>=${since}`,
    openedPullRequests: `is:pr created:>=${since}`,
    mergedPullRequests: `is:pr merged:>=${since}`,
  };

  const results = await Promise.all(
    Object.entries(queries).map(async ([key, qualifier]) => {
      const result = await search(owner, repo, qualifier, token, 100);
      const entries = result.items.map((item) => ({
        labels: item.labels?.map((label) => label.name) ?? [],
        number: item.number,
        title: item.title,
        url: item.html_url,
      }));
      const aiEntries = entries.filter(isAiRelated);
      return [
        key,
        {
          count: result.total_count,
          items: entries.slice(0, 3),
          ai: {
            count: aiEntries.length,
            items: aiEntries.slice(0, 3),
          },
        },
      ];
    }),
  );

  const activity = Object.fromEntries(results);

  return {
    generatedAt: new Date(now).toISOString(),
    owner,
    repo,
    since,
    activity,
    aiActivity: Object.fromEntries(
      Object.entries(activity).map(([key, value]) => [key, value.ai]),
    ),
  };
}
