import assert from "node:assert/strict";
import test from "node:test";

import { classifyPullRequest, summarizePullRequests } from "../src/classify.mjs";

function pullRequest(overrides = {}) {
  return {
    number: 1,
    title: "Test PR",
    url: "https://github.com/mixelpixx/Konnect/pull/1",
    isDraft: false,
    mergeable: "MERGEABLE",
    reviewDecision: null,
    commits: {
      nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }],
    },
    ...overrides,
  };
}

test("green mergeable pull request waits for maintainer", () => {
  const result = classifyPullRequest(pullRequest());
  assert.equal(result.readyToMerge, true);
  assert.equal(result.waitingMaintainer, true);
  assert.equal(result.waitingContributor, false);
});

test("conflicted pull request waits for contributor", () => {
  const result = classifyPullRequest(
    pullRequest({ mergeable: "CONFLICTING" }),
  );
  assert.equal(result.conflicted, true);
  assert.equal(result.readyToMerge, false);
  assert.equal(result.waitingContributor, true);
});

test("changes requested waits for contributor even with green checks", () => {
  const result = classifyPullRequest(
    pullRequest({ reviewDecision: "CHANGES_REQUESTED" }),
  );
  assert.equal(result.waitingContributor, true);
  assert.equal(result.readyToMerge, false);
});

test("summary exposes intentionally overlapping workflow counts", () => {
  const summary = summarizePullRequests([
    pullRequest(),
    pullRequest({ number: 2, isDraft: true, mergeable: "CONFLICTING" }),
  ]);
  assert.equal(summary.open, 2);
  assert.equal(summary.draft, 1);
  assert.equal(summary.conflicted, 1);
  assert.equal(summary.waitingContributor, 1);
  assert.equal(summary.readyToMerge, 1);
});
