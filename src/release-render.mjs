import { ICON_URL } from "./render.mjs";

const REQUIRED_COMPATIBILITY = [
  "testedPlatforms",
  "guidanceStatus",
  "mcpClientStatus",
  "workflowStatus",
  "restartSteps",
];

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be non-empty text`);
  }
}

function githubReleaseUrl(value, label) {
  requireText(value, label);
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    !/^[^/]+\/[^/]+\/releases\/tag\/[^/]+$/.test(url.pathname.slice(1))
  ) {
    throw new Error(`${label} must be a GitHub release-tag URL`);
  }
}

export function validateReleaseBundle(bundle) {
  requireText(bundle?.id, "id");
  if (!Array.isArray(bundle?.announcements) || bundle.announcements.length === 0) {
    throw new Error("announcements must contain at least one release");
  }

  for (const [index, item] of bundle.announcements.entries()) {
    const label = `announcements[${index}]`;
    requireText(item.project, `${label}.project`);
    requireText(item.version, `${label}.version`);
    githubReleaseUrl(item.releaseUrl, `${label}.releaseUrl`);
    if (!Array.isArray(item.highlights) || item.highlights.length === 0) {
      throw new Error(`${label}.highlights must not be empty`);
    }
    item.highlights.forEach((value, highlightIndex) =>
      requireText(value, `${label}.highlights[${highlightIndex}]`),
    );
    for (const key of REQUIRED_COMPATIBILITY) {
      requireText(item.compatibility?.[key], `${label}.compatibility.${key}`);
    }
  }
}

export function renderReleaseAnnouncement(item) {
  const compatibility = item.compatibility;
  const lines = [
    `${item.emoji ?? "🚀"} **${item.project} ${item.version} is available**`,
    "",
    `Release: ${item.releaseUrl}`,
    "",
    "**What’s new**",
    ...item.highlights.map((highlight) => `• ${highlight}`),
    "",
    "**Compatibility and validation**",
    `• Platforms: ${compatibility.testedPlatforms}`,
    `• Guidance: ${compatibility.guidanceStatus}`,
    `• MCP clients: ${compatibility.mcpClientStatus}`,
    `• Workflow: ${compatibility.workflowStatus}`,
    `• Restart/upgrade: ${compatibility.restartSteps}`,
  ];
  if (compatibility.knownLimitations) {
    lines.push(`• Known limitation: ${compatibility.knownLimitations}`);
  }
  const content = lines.join("\n");
  if (content.length > 2000) {
    throw new Error(`${item.project} announcement exceeds Discord's 2000-character limit`);
  }
  return {
    username: "Konnect Releases",
    avatar_url: ICON_URL,
    allowed_mentions: { parse: [] },
    content,
  };
}

export function renderReleaseBundle(bundle) {
  return bundle.announcements.map(renderReleaseAnnouncement);
}
