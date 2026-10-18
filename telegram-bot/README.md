# KewanganKu TechDesk bot (Telegram + Workers AI)

This is a private Telegram bot. It helps with technical problems and can create, read, update and delete:
- **Tech issues and notes** in the D1 database `techdesk-bot`
- **KewanganKu finance records** (expenses, debts, bills, subscriptions, vehicles, fuel logs) in the D1 database `kewanganku-sync`, table `account_state`. Writes use the same revision check as the app, so the app merges them like edits from another device.

Every finance write and every delete sends a **Confirm** button first. Nothing changes until you tap it. Only the Telegram ids in `OWNER_ID` can use the bot, and only in a private chat.

## Deployed as
Worker `techdesk-ai` → https://techdesk-ai.muhammadaiman20.workers.dev. It replaced the earlier TechDesk worker, and the old version is in the Worker's version history.

Secrets: `TELEGRAM_TOKEN`, `WEBHOOK_SECRET`, `OWNER_ID`, `OWNER_EMAIL`. Set them with `npx wrangler secret put <NAME>`.

## Cloudflare Access (required)
Every `*.workers.dev` URL on this account is behind Access, so Telegram can't reach the bot until you add a bypass.
In Zero Trust → Access → Applications → Add → Self-hosted, add these two public hostnames:
- `techdesk-ai.muhammadaiman20.workers.dev`, path `telegram`
- `techdesk-ai.muhammadaiman20.workers.dev`, path `setup`

Give the application a **Bypass** policy with the **Everyone** rule. Both paths still check the webhook secret. `/health` and everything else stay behind your login.

## Register the webhook (once, after the bypass)
```sh
curl -X POST https://techdesk-ai.muhammadaiman20.workers.dev/setup -H "Authorization: Bearer <WEBHOOK_SECRET>"
```
Next, message the bot. If it says "private bot, your id is …", run `npx wrangler secret put OWNER_ID` with that id.

## Develop
```sh
npm test                    # from the repo root: tests/telegramBot.test.mjs runs on node:sqlite
cd telegram-bot && npx wrangler deploy
```
Models: `@cf/openai/gpt-oss-120b`, falling back to `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Screenshots and receipts are read with `llama-4-scout`.
