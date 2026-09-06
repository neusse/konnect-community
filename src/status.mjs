import { upsertWebhookMessage } from "./discord.mjs";
import { collectSnapshot } from "./github.mjs";
import { renderStatus } from "./render.mjs";

function sourceRepository(value = "mixelpixx/Konnect") {
  const [owner, repo, extra] = value.split("/");
  if (!owner || !repo || extra) throw new Error("SOURCE_REPO must be owner/repo");
  return { owner, repo };
}

const source = sourceRepository(process.env.SOURCE_REPO);
const snapshot = await collectSnapshot({
  ...source,
  token: process.env.GITHUB_TOKEN,
});
const payload = renderStatus(snapshot);

if (process.env.DRY_RUN === "true") {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

if (!process.env.DISCORD_STATUS_WEBHOOK_URL) {
  process.stdout.write(
    "::warning::DISCORD_STATUS_WEBHOOK_URL is not configured; skipping Discord update.\n",
  );
  process.exit(0);
}

const result = await upsertWebhookMessage({
  webhookUrl: process.env.DISCORD_STATUS_WEBHOOK_URL,
  messageId: process.env.DISCORD_STATUS_MESSAGE_ID,
  payload,
});

if (result.created) {
  process.stdout.write(
    `Created dashboard message ${result.messageId}. Save this as the DISCORD_STATUS_MESSAGE_ID repository variable.\n`,
  );
} else {
  process.stdout.write(`Updated dashboard message ${result.messageId}.\n`);
}
