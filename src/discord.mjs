function validateWebhookUrl(webhookUrl) {
  const url = new URL(webhookUrl);
  if (url.protocol !== "https:" || url.hostname !== "discord.com") {
    throw new Error("Discord webhook URL must use https://discord.com");
  }
  if (!url.pathname.startsWith("/api/webhooks/")) {
    throw new Error("Discord webhook URL has an unexpected path");
  }
  return url.toString().replace(/\/$/, "");
}

async function discordJson(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord request failed (${response.status}): ${body}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function upsertWebhookMessage({ webhookUrl, messageId, payload }) {
  const base = validateWebhookUrl(webhookUrl);
  if (messageId) {
    await discordJson(`${base}/messages/${encodeURIComponent(messageId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return { created: false, messageId };
  }

  const created = await discordJson(`${base}?wait=true`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { created: true, messageId: created.id };
}

export async function postWebhookMessage({ webhookUrl, payload }) {
  const base = validateWebhookUrl(webhookUrl);
  return discordJson(`${base}?wait=true`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
