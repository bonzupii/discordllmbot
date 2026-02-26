# Copilot Instructions for DiscordLLMBot

## Architecture snapshot

DiscordLLMBot is a monorepo with:

- `bot/`: Discord runtime + API server
- `dashboard/`: React/Vite admin UI
- `shared/`: storage/config/logger modules shared by bot and API
- `docs/`: VitePress docs

The API server is part of the bot process (`bot/src/api/server.ts`) and exposes dashboard endpoints plus Socket.io log/status streams.

## Source-of-truth configuration model

Use the current normalized schema:

### Global config (`global_config`)
- `botPersona`: `username`, `description`, `globalRules[]`
- `llm`: `provider`, `geminiModel`, `ollamaModel`, `retryAttempts`, `retryBackoffMs`
- `memory`: `maxMessages`, `maxMessageAgeDays`
- `logger`: `maxLogLines`, `logReplyDecisions`, `logSql`

### Server config (`server_configs`)
- `nickname`
- `speakingStyle[]`
- `replyBehavior`:
  - `replyProbability`
  - `minDelayMs`
  - `maxDelayMs`
  - `mentionOnly`
  - `ignoreUsers[]`
  - `ignoreChannels[]`
  - `ignoreKeywords[]`
  - `guildSpecificChannels`

### Persistence policy

Configuration is persisted using typed columns (not a single JSON blob column). Keep persistence SQL in `shared/storage/persistence.js` aligned with schema setup in `shared/storage/database.js`.

No legacy/backward-compat adapters are required; rebuilding/resetting DB during development is acceptable.

## Reply logic policy

Primary reply decision logic in `bot/src/core/replyDecider.ts` should remain:

1. ignore lists (user/channel/keyword),
2. relationship ignored flag,
3. `mentionOnly` gate,
4. probability gate.

Do not reintroduce legacy mode-based strategy flow unless explicitly requested.

## Coding conventions

### Bot/shared
- 4-space indentation
- single quotes
- semicolons
- nullish defaults with `??`
- async operations in `try/catch`
- logger usage via `shared/utils/logger.js`

### Dashboard
- TypeScript + MUI functional components
- aliases: `@theme`, `@pages`, `@components`, `@hooks`, `@services`, `@types`
- keep `dashboard/src/types/index.ts` synchronized with API payloads

## Validation commands

### Bot
```bash
cd bot
npm run lint
npm run type-check
```

### Dashboard
```bash
cd dashboard
npm run lint
npm run type-check
npm run build
```

### Root
```bash
npm run dev
npm run dev:build
npm run dev:down
```
