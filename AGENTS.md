# AGENTS.md - DiscordLLMBot Developer Guide

## Overview

This repository is a monorepo:

- `bot/` - Discord bot + Express/Socket.io API (TypeScript)
- `dashboard/` - React dashboard (TypeScript, Vite, MUI)
- `shared/` - shared DB/config/logger utilities
- `docs/` - VitePress docs site

DiscordLLMBot generates contextual replies using LLM APIs (Google Gemini or Ollama). The bot maintains persona and can customize behavior per user and per server.

**Data Flow:**
1. User message → stored in PostgreSQL
2. Prompt builder combines: bot persona + user relationship + conversation context
3. LLM API (Gemini/Ollama) generates reply → Bot responds in Discord

---

## Build, lint, and type-check commands

### Root
```bash
npm run dev           # Start bot, db, dashboard with Docker
npm run dev:build     # Rebuild and start
npm run dev:down      # Stop containers
npm run build         # Build Docker images
npm run docs          # Run docs dev server
```

### Bot
```bash
cd bot
npm run dev           # Start with nodemon
npm run lint
npm run type-check
npm run start         # node dist/index.js
```

### Dashboard
```bash
cd dashboard
npm run dev           # Start Vite dev server (port 5173)
npm run lint
npm run type-check
npm run build         # Production build
npm run preview       # Preview production build
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
- `sandbox`: `enabled`, `timeoutMs`, `allowedCommands[]`

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

## Project Structure

```
bot/src/
  index.ts              # Main entry, Discord client setup
  api/server.ts         # Express + Socket.io API (port 3000)
  llm/                  # LLM providers (gemini, ollama, qwen)
  memory/               # Per-channel message history
  personality/          # Bot persona + relationships
  core/                 # Prompt building, reply decisions
  sandbox/              # Docker sandbox executor for isolated command execution
  events/               # Discord event handlers
  utils/                # Utility functions

shared/
  storage/              # Database connection, persistence
  config/               # Configuration loading
  utils/                # Logger, shared utilities

dashboard/src/
  pages/                # Route pages (Dashboard, Settings, Servers, Logs, Playground)
  components/          # Reusable UI components
  hooks/                # Custom React hooks
  services/             # API calls to bot
  theme.ts              # MUI dark theme
```

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

**Null Handling**
```javascript
// Good
const mode = replyBehavior.mode ?? 'mention-only';
const prob = typeof replyBehavior.replyProbability === 'number' ? replyBehavior.replyProbability : 1.0;

// Bad
const mode = replyBehavior.mode || 'mention-only';
```

**Imports**
```javascript
// Good
import { logger } from '../../shared/utils/logger.js';
import { loadConfig } from '../../shared/config/configLoader.js';
```

---

## Dashboard code style guidelines

- Use TypeScript types from `@types` where available
- Use aliases: `@theme`, `@pages`, `@components`, `@hooks`, `@services`, `@types`
- Functional components and hooks
- Use MUI components and `sx` styling
- Keep server/global config shapes aligned with `dashboard/src/types/index.ts`

**Import examples:**
```typescript
import theme from '@theme';
import { Dashboard, Settings } from '@pages';
import { useHealth } from '@hooks';
```

---

## Key runtime behaviors

- Reply decision no longer uses legacy mode-based strategy routing in primary flow.
- Current decision path uses ignore checks + relationship ignored + `mentionOnly` + probability.
- Channel context and user relationships are cached in memory and persisted to PostgreSQL.
- Dashboard settings use debounced auto-save (1-second delay) to prevent API spam.

---

## Key implementation patterns

1. **Strategy Pattern** - Reply behaviors are configurable via `replyBehavior` settings
2. **Exponential Backoff** - Retry logic with jitter in LLM calls
3. **In-memory Cache + DB Persistence** - `guildRelationships` and `guildContexts` cached in memory, persisted to PostgreSQL
4. **Lock Mechanism** - Prevents race conditions during schema setup
5. **Configuration** - All config in PostgreSQL (`global_config`, `server_configs` tables)
6. **Docker Sandbox** - Isolated container execution for user commands via Docker-in-Docker (DinD)

---

## Database schema

Key tables:
- `global_config` - System-wide settings (typed columns)
- `server_configs` - Per-server overrides (typed columns)
- `guilds` - Joined servers
- `relationships` - Per-user relationship data
- `messages` - Message history
- `bot_replies` - Reply analytics

---

## Environment variables

```bash
# Discord
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# LLM Provider
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

---

## Common debugging pointers

1. Check root log file (`discordllmbot.log`).
2. Inspect message flow in `bot/src/events/messageCreate.ts`.
3. Inspect reply checks in `bot/src/core/replyDecider.ts`.
4. Use dashboard Logs page for real-time stream.
5. Verify configuration in database (use pgAdmin at http://localhost:5050).

---

## Common tasks

### Adding a Feature
1. Determine module location (memory, llm, personality, core, api)
2. Consider prompt impact
3. Use relationships for per-user data
4. Add logging via logger utility
5. Add API endpoint in `bot/src/api/server.ts` if dashboard integration needed

### Debugging
1. Check `discordllmbot.log` for errors and API traces
2. Review `bot/src/events/messageCreate.ts` for message flow
3. Check `bot/src/core/replyDecider.ts` for reply decision logic
4. Use dashboard Logs page for real-time logs
