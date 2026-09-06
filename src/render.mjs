import { summarizePullRequests } from "./classify.mjs";

export const KONNECT_URL = "https://github.com/mixelpixx/Konnect";
export const ICON_URL =
  "https://raw.githubusercontent.com/neusse/konnect-community/main/assets/konnect-discord-icon.png";

function shorten(text, limit = 110) {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function links(items, predicate, limit = 4) {
  const selected = items.filter(predicate).slice(0, limit);
  return selected.length
    ? selected
        .map((item) => `[#${item.number}](${item.url}) ${shorten(item.title)}`)
        .join("\n")
    : "None";
}

export function renderStatus(snapshot) {
  const prs = summarizePullRequests(snapshot.pullRequests);
  const counts = snapshot.counts;
  const release = snapshot.latestRelease
    ? `[${snapshot.latestRelease.tag}](${snapshot.latestRelease.url})`
    : "No published release";

  return {
    username: "Konnect Project Status",
    avatar_url: ICON_URL,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: "Konnect project status",
        url: KONNECT_URL,
        description:
          "Live, read-only project health from GitHub. Categories can overlap.",
        color: 0xd97706,
        thumbnail: { url: ICON_URL },
        fields: [
          {
            name: "Issues",
            value: `**${counts.openIssues}** open · **${counts.closedIssues}** closed\n**${counts.activeIssues}** active since ${snapshot.activeSince}`,
            inline: true,
          },
          {
            name: "Issue attention",
            value: `**${counts.p0Issues}** P0 · **${counts.claimedIssues}** claimed\n**${counts.maintainerDecisionIssues}** maintainer decision`,
            inline: true,
          },
          {
            name: "Pull requests",
            value: `**${prs.open}** open · **${counts.mergedPullRequests}** merged\n**${counts.closedUnmergedPullRequests}** closed unmerged`,
            inline: true,
          },
          {
            name: "PR workflow",
            value: `**${prs.draft}** draft · **${prs.conflicted}** conflicted · **${prs.checksFailing}** CI failing\n**${prs.waitingReview}** waiting review · **${prs.waitingContributor}** waiting contributor\n**${prs.readyToMerge}** ready / waiting maintainer · **${prs.approved}** approved`,
            inline: false,
          },
          {
            name: "Ready to merge",
            value: links(prs.items, (item) => item.readyToMerge),
            inline: false,
          },
          {
            name: "Contributor action",
            value: links(prs.items, (item) => item.waitingContributor),
            inline: false,
          },
          {
            name: "Latest release",
            value: release,
            inline: true,
          },
        ],
        footer: { text: "Updated automatically from GitHub" },
        timestamp: snapshot.generatedAt,
      },
    ],
  };
}

function activityLine(label, item) {
  return `**${label}: ${item.count}**${
    item.items.length
      ? `\n${item.items.map((entry) => `[#${entry.number}](${entry.url}) ${shorten(entry.title)}`).join("\n")}`
      : ""
  }`;
}

export function renderDailyDigest(snapshot) {
  const activity = snapshot.activity;
  const total = Object.values(activity).reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return null;

  return {
    username: "Konnect GitHub Digest",
    avatar_url: ICON_URL,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: "Konnect GitHub activity — last 24 hours",
        url: KONNECT_URL,
        color: 0x3b82f6,
        description: [
          activityLine("Issues opened", activity.openedIssues),
          activityLine("Issues closed", activity.closedIssues),
          activityLine("PRs opened", activity.openedPullRequests),
          activityLine("PRs merged", activity.mergedPullRequests),
        ].join("\n\n"),
        footer: { text: "Daily read-only digest from GitHub" },
        timestamp: snapshot.generatedAt,
      },
    ],
  };
}
