import { readFile } from "node:fs/promises";
import path from "node:path";

import { postWebhookMessage } from "./discord.mjs";
import { renderReleaseBundle, validateReleaseBundle } from "./release-render.mjs";

const manifestPath = path.resolve(
  process.env.RELEASE_ANNOUNCEMENT ?? "announcements/v0.11.1.json",
);
const bundle = JSON.parse(await readFile(manifestPath, "utf8"));
validateReleaseBundle(bundle);

const payloads = renderReleaseBundle(bundle);
if (process.env.DRY_RUN === "true") {
  process.stdout.write(`${JSON.stringify(payloads, null, 2)}\n`);
  process.exit(0);
}

if (process.env.PUBLISH_RELEASE_BUNDLE !== bundle.id) {
  throw new Error(
    `Refusing to publish: PUBLISH_RELEASE_BUNDLE must equal ${bundle.id}`,
  );
}
if (!process.env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL) {
  throw new Error("DISCORD_ANNOUNCEMENTS_WEBHOOK_URL is not configured");
}

for (const payload of payloads) {
  await postWebhookMessage({
    webhookUrl: process.env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL,
    payload,
  });
}
process.stdout.write(`Published ${payloads.length} release announcements.\n`);
