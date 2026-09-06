const FAILED_CHECK_STATES = new Set(["ERROR", "FAILURE"]);
const PENDING_CHECK_STATES = new Set(["EXPECTED", "PENDING"]);

export const AI_LABELS = new Set([
  "area:agent-guidance",
  "client:claude",
  "client:codex",
  "client:other",
]);

export function labelNames(item) {
  const labels = item.labels?.nodes ?? item.labels ?? [];
  return labels.map((label) => label.name ?? label);
}

export function isAiRelated(item) {
  return labelNames(item).some((label) => AI_LABELS.has(label));
}

export function latestCheckState(pullRequest) {
  return (
    pullRequest.commits?.nodes?.at(-1)?.commit?.statusCheckRollup?.state ?? null
  );
}

export function classifyPullRequest(pullRequest) {
  const checkState = latestCheckState(pullRequest);
  const conflicted = pullRequest.mergeable === "CONFLICTING";
  const changesRequested = pullRequest.reviewDecision === "CHANGES_REQUESTED";
  const checksFailing = FAILED_CHECK_STATES.has(checkState);
  const checksPending = PENDING_CHECK_STATES.has(checkState);
  const approved = pullRequest.reviewDecision === "APPROVED";

  const waitingContributor =
    pullRequest.isDraft || conflicted || changesRequested || checksFailing;
  const readyToMerge =
    !pullRequest.isDraft &&
    pullRequest.mergeable === "MERGEABLE" &&
    checkState === "SUCCESS" &&
    !changesRequested;
  const waitingReview =
    !pullRequest.isDraft &&
    !waitingContributor &&
    !readyToMerge;

  return {
    ...pullRequest,
    approved,
    changesRequested,
    checkState,
    checksFailing,
    checksPending,
    conflicted,
    readyToMerge,
    waitingContributor,
    waitingMaintainer: readyToMerge,
    waitingReview,
  };
}

export function summarizePullRequests(pullRequests) {
  const classified = pullRequests.map(classifyPullRequest);
  const count = (field) => classified.filter((item) => item[field]).length;

  return {
    approved: count("approved"),
    checksFailing: count("checksFailing"),
    checksPending: count("checksPending"),
    conflicted: count("conflicted"),
    draft: classified.filter((item) => item.isDraft).length,
    open: classified.length,
    readyToMerge: count("readyToMerge"),
    waitingContributor: count("waitingContributor"),
    waitingMaintainer: count("waitingMaintainer"),
    waitingReview: count("waitingReview"),
    items: classified,
  };
}

export function summarizeAiPullRequests(pullRequests) {
  return summarizePullRequests(pullRequests.filter(isAiRelated));
}
