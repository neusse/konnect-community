import assert from "node:assert/strict";
import test from "node:test";

import {
  renderReleaseBundle,
  validateReleaseBundle,
} from "../src/release-render.mjs";

const bundle = {
  id: "v1.2.3",
  announcements: [
    {
      project: "Konnect",
      version: "v1.2.3",
      releaseUrl: "https://github.com/example/Konnect/releases/tag/v1.2.3",
      highlights: ["A focused improvement."],
      compatibility: {
        testedPlatforms: "Windows, Linux, and macOS.",
        guidanceStatus: "Reviewed.",
        mcpClientStatus: "Connected.",
        workflowStatus: "Guided workflow tested.",
        restartSteps: "Restart the MCP client.",
      },
    },
  ],
};

test("release bundle renders a mention-safe Discord payload", () => {
  validateReleaseBundle(bundle);
  const [payload] = renderReleaseBundle(bundle);
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.match(payload.content, /What’s new/);
  assert.match(payload.content, /Tools|Workflow/);
  assert.ok(payload.content.length <= 2000);
});

test("release bundle requires the compatibility evidence fields", () => {
  const invalid = structuredClone(bundle);
  delete invalid.announcements[0].compatibility.workflowStatus;
  assert.throws(() => validateReleaseBundle(invalid), /workflowStatus/);
});

test("release bundle rejects non-release URLs", () => {
  const invalid = structuredClone(bundle);
  invalid.announcements[0].releaseUrl = "https://example.com/download";
  assert.throws(() => validateReleaseBundle(invalid), /GitHub release-tag URL/);
});
