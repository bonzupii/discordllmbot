# AGENTS.md - DiscordLLMBot Developer Guide

## Overview

This repository is a monorepo:

- `bot/` - Discord bot + Express/Socket.io API (TypeScript)
- `dashboard/` - React dashboard (TypeScript, Vite, MUI)
- `shared/` - shared DB/config/logger utilities
- `docs/` - VitePress docs site

---

## Build, lint, and type-check commands

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

---

## Current configuration/data model (important)

Configuration has been normalized and persisted in typed DB columns.

### Global config (`global_config`)

Represents system-wide config and maps to:

- `botPersona`: `username`, `description`, `globalRules[]`
- `llm`: `provider`, `geminiModel`, `ollamaModel`, `retryAttempts`, `retryBackoffMs`
- `memory`: `maxMessages`, `maxMessageAgeDays`
- `logger`: `maxLogLines`, `logReplyDecisions`, `logSql`

### Server config (`server_configs`)

Represents per-guild settings and maps to:

- `nickname` (optional)
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

### Backward compatibility policy

- Legacy JSON blob config compatibility has been removed.
- If schema/data is incompatible during local development, rebuild/reset DB.

---

## Bot code style guidelines

- 4-space indentation
- Single quotes
- Semicolons required
- Use `.js` extensions for local imports
- Prefer `const`; use `let` only when reassigning
- Use nullish coalescing (`??`) for defaults
- Wrap async work in `try/catch` and log through shared logger

Logger methods:
- `logger.error`, `logger.warn`, `logger.info`, `logger.api`, `logger.message`, `logger.sql`

---

## Dashboard code style guidelines

- Use TypeScript types from `@types` where available
- Use aliases: `@theme`, `@pages`, `@components`, `@hooks`, `@services`, `@types`
- Functional components and hooks
- Use MUI components and `sx` styling
- Keep server/global config shapes aligned with `dashboard/src/types/index.ts`

---

## Key runtime behaviors

- Reply decision no longer uses legacy mode-based strategy routing in primary flow.
- Current decision path uses ignore checks + relationship ignored + `mentionOnly` + probability.
- Channel context and user relationships are cached in memory and persisted to PostgreSQL.

---

## Common debugging pointers

1. Check root log file (`discordllmbot.log`).
2. Inspect message flow in `bot/src/events/messageCreate.ts`.
3. Inspect reply checks in `bot/src/core/replyDecider.ts`.
4. Use dashboard Logs page for real-time stream.
