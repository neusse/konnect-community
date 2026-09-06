import assert from "node:assert/strict";
import test from "node:test";

import { renderDailyDigest, renderStatus } from "../src/render.mjs";

const snapshot = {
  activeSince: "2026-08-23",
  counts: {
    openIssues: 46,
    closedIssues: 131,
    p0Issues: 7,
    claimedIssues: 10,
    maintainerDecisionIssues: 1,
    activeIssues: 46,
    claudeIssuesOpen: 2,
    claudeIssuesClosed: 3,
    codexIssuesOpen: 4,
    codexIssuesClosed: 5,
    otherClientIssuesOpen: 1,
    otherClientIssuesClosed: 2,
    agentGuidanceIssuesOpen: 6,
    agentGuidanceIssuesClosed: 7,
    aiMaintainerDecisionIssues: 1,
    mergedPullRequests: 204,
    closedUnmergedPullRequests: 35,
  },
  generatedAt: "2026-09-06T17:00:00.000Z",
  latestRelease: {
    tag: "v0.11.0",
    url: "https://github.com/mixelpixx/Konnect/releases/tag/v0.11.0",
  },
  pullRequests: [],
};

test("status payload prevents mentions and contains project counts", () => {
  const payload = renderStatus(snapshot);
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.match(payload.embeds[0].fields[0].value, /46/);
  assert.match(payload.embeds[0].fields[0].value, /131/);
  const aiIssues = payload.embeds[0].fields.find(
    (field) => field.name === "AI/client issues",
  );
  assert.match(aiIssues.value, /Claude \*\*2\*\* open/);
  assert.match(aiIssues.value, /guidance \*\*6\*\* \/ \*\*7\*\*/);
  for (const field of payload.embeds[0].fields) {
    assert.ok(field.value.length <= 1024);
  }
});

test("daily digest is omitted when nothing happened", () => {
  const payload = renderDailyDigest({
    generatedAt: snapshot.generatedAt,
    activity: {
      openedIssues: { count: 0, items: [] },
      closedIssues: { count: 0, items: [] },
      openedPullRequests: { count: 0, items: [] },
      mergedPullRequests: { count: 0, items: [] },
    },
  });
  assert.equal(payload, null);
});

test("daily digest highlights AI-labeled activity", () => {
  const item = {
    count: 1,
    items: [
      {
        number: 42,
        title: "Codex guidance fix",
        url: "https://github.com/mixelpixx/Konnect/issues/42",
      },
    ],
  };
  const none = { count: 0, items: [] };
  const payload = renderDailyDigest({
    generatedAt: snapshot.generatedAt,
    activity: {
      openedIssues: item,
      closedIssues: none,
      openedPullRequests: none,
      mergedPullRequests: none,
    },
    aiActivity: {
      openedIssues: item,
      closedIssues: none,
      openedPullRequests: none,
      mergedPullRequests: none,
    },
  });
  assert.equal(payload.embeds[0].fields[0].name, "AI/client activity");
  assert.match(payload.embeds[0].fields[0].value, /Codex guidance fix/);
});
