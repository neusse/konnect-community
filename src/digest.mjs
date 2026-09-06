import { postWebhookMessage } from "./discord.mjs";
import { collectDailyActivity } from "./github.mjs";
import { renderDailyDigest } from "./render.mjs";

function sourceRepository(value = "mixelpixx/Konnect") {
  const [owner, repo, extra] = value.split("/");
  if (!owner || !repo || extra) throw new Error("SOURCE_REPO must be owner/repo");
  return { owner, repo };
}

const source = sourceRepository(process.env.SOURCE_REPO);
const snapshot = await collectDailyActivity({
  ...source,
  token: process.env.GITHUB_TOKEN,
});
const payload = renderDailyDigest(snapshot);

if (!payload) {
  process.stdout.write("No GitHub activity to report.\n");
  process.exit(0);
}

if (process.env.DRY_RUN === "true") {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

if (!process.env.DISCORD_FEED_WEBHOOK_URL) {
  process.stdout.write(
    "::warning::DISCORD_FEED_WEBHOOK_URL is not configured; skipping Discord digest.\n",
  );
  process.exit(0);
}

await postWebhookMessage({
  webhookUrl: process.env.DISCORD_FEED_WEBHOOK_URL,
  payload,
});
process.stdout.write("Posted daily GitHub activity digest.\n");
