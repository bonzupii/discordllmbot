# DiscordLLMBot

DiscordLLMBot is a monorepo for a Discord bot and a React dashboard. The bot generates persona-driven replies using Gemini or Ollama, stores operational data in PostgreSQL, and exposes an API/Socket.io server for dashboard management.

## Monorepo layout

- `bot/` — Discord bot + Express API + Socket.io (TypeScript)
- `dashboard/` — React + Vite + MUI dashboard (TypeScript)
- `shared/` — shared config, storage, and logger utilities
- `docs/` — VitePress documentation project

## Core architecture

1. Discord message event enters `bot/src/events/messageCreate.ts`.
2. Bot loads effective config from DB via `shared/config/configLoader.js`.
3. Prompt is built from persona + relationship + channel context.
4. LLM provider (`gemini` or `ollama`) generates reply.
5. Reply is sent to Discord and analytics/context are persisted.

The API server lives inside the bot process (`bot/src/api/server.ts`) and serves dashboard routes under `/api`.

## Current configuration model

Configuration is now split into **global** and **server** models.

### Global config (`global_config` table)

- `botPersona`
  - `username`
  - `description`
  - `globalRules[]`
- `llm`
  - `provider` (`gemini` | `ollama`)
  - `geminiModel`
  - `ollamaModel`
  - `retryAttempts`
  - `retryBackoffMs`
- `memory`
  - `maxMessages`
  - `maxMessageAgeDays`
- `logger`
  - `maxLogLines`
  - `logReplyDecisions`
  - `logSql`

### Server config (`server_configs` table)

- `nickname` (optional override of global username)
- `speakingStyle[]`
- `replyBehavior`
  - `replyProbability`
  - `minDelayMs`
  - `maxDelayMs`
  - `mentionOnly`
  - `ignoreUsers[]`
  - `ignoreChannels[]`
  - `ignoreKeywords[]`
  - `guildSpecificChannels` map (`allowed[]` / `ignored[]`)

## Database notes

`shared/storage/database.js` defines schema creation. Configuration is persisted as typed columns in `global_config` and `server_configs` rather than opaque JSON blobs.

If you changed schema manually or are iterating quickly, it is valid to rebuild/reset DB data during local dev.

## Reply decision behavior (current)

`bot/src/core/replyDecider.ts` now uses:

- ignore user/channel/keyword checks,
- relationship ignored check,
- `mentionOnly` gate,
- probability roll (`replyProbability`).

Legacy mode-based strategy routing (`active/passive/disabled/mention-only`) is no longer part of the main decision flow.

## Environment variables

```bash
# Discord
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# LLM
GEMINI_API_KEY=
OLLAMA_API_URL=

# PostgreSQL
DATABASE_URL=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

# Ports
API_PORT=3000
DASHBOARD_PORT=5173
```

## Development commands

### Root

```bash
npm run dev
npm run dev:build
npm run dev:down
npm run build
npm run docs
```

### Bot

```bash
cd bot
npm run dev
npm run lint
npm run type-check
npm run start
```

### Dashboard

```bash
cd dashboard
npm run dev
npm run lint
npm run type-check
npm run build
npm run preview
```
