# Konnect Community Automation

Community infrastructure for [Konnect](https://github.com/mixelpixx/Konnect),
the Rust and KiCad IPC MCP server for AI-assisted PCB design.

This repository keeps Discord automation separate from the Konnect product. It
queries public GitHub state with read-only permissions and publishes two useful,
low-noise views:

- a single editable project-status dashboard, refreshed every 15 minutes;
- a once-daily digest of opened and closed issues and opened and merged pull
  requests.

It deliberately does **not** run a persistent Discord bot, read Discord member
messages, or write to GitHub.

## Discord layout

- `#project-status` — one webhook-owned status embed that is edited in place
- `#github-feed` — a daily activity digest; no comment-by-comment firehose

The status card reports issue totals, P0 and claimed work, maintainer decisions,
pull-request totals, drafts, conflicts, CI failures, review state, contributor
action, and merge-ready work. Categories intentionally overlap: a draft can also
be conflicted, for example.

## Status rules

- **Waiting for contributor:** draft, merge conflict, requested changes, or
  failing checks.
- **Waiting for review:** non-draft work that is not blocked and is not yet
  merge-ready.
- **Waiting for maintainer / ready to merge:** non-draft, mergeable, required
  check rollup successful, and no requested changes.
- **Approved:** GitHub's review decision is `APPROVED`. This is shown separately
  because Konnect governance does not require approval for every merge.
- **Active issue:** an open issue updated within the last 14 days.

## Repository configuration

The workflows require:

| Kind | Name | Purpose |
| --- | --- | --- |
| Actions secret | `DISCORD_STATUS_WEBHOOK_URL` | Webhook for `#project-status` |
| Actions variable | `DISCORD_STATUS_MESSAGE_ID` | Message edited on each refresh |
| Actions secret | `DISCORD_FEED_WEBHOOK_URL` | Webhook for `#github-feed` |

To bootstrap the dashboard, run `npm run status` once without a message ID. It
prints the created Discord message ID; save that value as
`DISCORD_STATUS_MESSAGE_ID`. Subsequent runs edit that message. Scheduled runs
exit successfully with a visible warning while their webhook secret is not yet
configured.

Never commit webhook URLs. Treat them like passwords and rotate them if they are
exposed.

## Local verification

Node.js 24 or newer is required.

```text
npm test
$env:DRY_RUN = "true"
$env:SOURCE_REPO = "mixelpixx/Konnect"
npm run status
npm run digest
```

`GITHUB_TOKEN` is optional for light local use and supplied automatically by
GitHub Actions. Authentication is recommended for reliable API rate limits.

## Why not a full bot?

Incoming Discord webhooks can create and edit rich messages without a bot user
or a persistent service. A bot becomes worthwhile only if the community later
needs interactive slash commands, Discord-to-GitHub mutations, role syncing, or
moderation beyond Discord's built-in tools.

## Attribution and license

Konnect and the source hero artwork are by the
[Konnect project](https://github.com/mixelpixx/Konnect). The Discord icon in
`assets/konnect-discord-icon.png` is a square rendering of that existing hero.

This repository is licensed under AGPL-3.0-only to match Konnect.
