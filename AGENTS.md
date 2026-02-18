# AGENTS.md - DiscordLLMBot Developer Guide

## Overview

This is a monorepo containing:
- **bot/** - Discord bot with Express API (Node.js, ES modules)
- **dashboard/** - React dashboard with TypeScript, Vite, MUI
- **shared/** - Common utilities (database, config, logging)
- **docs/** - Documentation site

---

## Build, Lint, and Test Commands

### Root (Monorepo)
```bash
npm run dev           # Start bot, db, dashboard with Docker
npm run dev:build     # Rebuild and start
npm run dev:down      # Stop containers
npm run build         # Build Docker images
npm run docs          # Run docs dev server
```

### Bot (Node.js)
```bash
cd bot
npm run lint          # ESLint (see Code Style below)
npm run start         # Start bot: node src/index.js
npm run dev:container # Dev with nodemon + debug port 9229
```

### Dashboard (React + TypeScript)
```bash
cd dashboard
npm run dev           # Start Vite dev server (port 5173)
npm run build          # Production build
npm run lint           # ESLint (TypeScript + React)
npm run type-check     # TypeScript: tsc --noEmit
npm run preview        # Preview production build
```

### Running a Single Test
There are currently no test files in this project. If tests are added:
```bash
# Bot - depends on test framework added (likely vitest)
cd bot && npm run test

# Dashboard - vitest is configured in eslint
cd dashboard && npm run test
```

---

## Code Style Guidelines

### Bot (JavaScript/ES Modules)

**Formatting & Linting**
- 4-space indentation (not tabs)
- Single quotes for strings
- Semicolons always
- Use ESLint rules from `bot/eslint.config.js`

**Key ESLint Rules**
- `prefer-const` - Use const by default, let only when reassigning
- `no-unused-vars` - Allow variables starting with `_` or `client`
- `no-console` - Off (use the logger utility instead)

**Imports**
- Use `.js` extensions for local imports
- Absolute paths from workspace root: `../../shared/utils/logger.js`

```javascript
// Good
import { logger } from '../../shared/utils/logger.js';
import { loadConfig } from '../../shared/config/configLoader.js';

// Bad
import("./foo.js");
```

**Naming Conventions**
- Files: camelCase (e.g., `replyDecider.js`, `messageCreate.js`)
- Functions: verbFirst (e.g., `buildPrompt`, `getRelationship`, `saveRelationships`)
- Constants: SCREAMING_SNAKE_CASE for config values
- Variables: camelCase

**Null Handling**
- Use **nullish coalescing (`??`)** for defaults, NOT `||`
```javascript
// Good
const mode = replyBehavior.mode ?? 'mention-only';
const prob = typeof replyBehavior.replyProbability === 'number' 
    ? replyBehavior.replyProbability 
    : 1.0;

// Bad
const mode = replyBehavior.mode || 'mention-only';
```

**Error Handling**
- Wrap async operations in try/catch
- Log errors with the logger utility
- Let errors propagate when appropriate

```javascript
try {
    await someAsyncOperation();
} catch (err) {
    logger.error('Operation failed', err);
    throw err;
}
```

**Logging**
- Use the logger from `shared/utils/logger.js`
- Log levels: `logger.error`, `logger.warn`, `logger.info`, `logger.api`, `logger.message`

---

### Dashboard (TypeScript + React)

**TypeScript Configuration**
- Strict mode enabled via `typescript-eslint`
- Use types from `@/types` when available
- Avoid `any` - disable `@typescript-eslint/no-explicit-any` rule

**Components**
- Use MUI components (`@mui/material`)
- Follow existing component patterns in `src/pages/` and `src/components/`
- Use path aliases: `@theme`, `@pages`, `@components`, `@hooks`, `@services`, `@types`

```typescript
import theme from '@theme';
import { Dashboard, Settings } from '@pages';
import { useHealth } from '@hooks';
```

**React Patterns**
- Functional components with hooks
- Use `ErrorBoundary` for error handling
- Custom hooks in `src/hooks/`
- Debounced auto-save for settings (1-second delay)

**Styling**
- MUI `sx` prop for inline styles
- Dark theme from `src/theme.ts`

---

## Project Structure

```
bot/src/
  index.js              # Main entry, Discord client setup
  api/server.js         # Express + Socket.io API (port 3000)
  llm/                  # LLM providers (gemini.js, ollama.js)
  memory/               # Per-channel message history
  personality/          # Bot persona + relationships
  core/                 # Prompt building, reply decisions
  strategies/           # Reply behavior strategies
  events/               # Discord event handlers
  utils/                # Utility functions

shared/
  storage/              # Database connection, persistence
  config/               # Configuration loading/validation
  utils/                # Logger, shared utilities

dashboard/src/
  pages/                # Route pages (Dashboard, Settings, Servers, etc.)
  components/          # Reusable UI components
  hooks/                # Custom React hooks
  services/             # API calls to bot
  theme.ts              # MUI dark theme
```

---

## Key Implementation Patterns

1. **Strategy Pattern** - Reply behaviors are pure functions in `strategies/replyStrategies.js`
2. **Exponential Backoff** - Retry logic with jitter in LLM calls
3. **In-memory Cache + DB Persistence** - `guildRelationships` and `guildContexts` cached in memory, persisted to PostgreSQL
4. **Lock Mechanism** - `shared/storage/lock.js` prevents race conditions during schema setup
5. **Configuration** - All config in PostgreSQL (`global_config`, `server_configs` tables)

---

## Environment Variables

```bash
# Discord
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# LLM Provider
GEMINI_API_KEY=        # Or use Ollama
OLLAMA_API_URL=        # http://host.docker.internal:11434

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

## Database Schema

Key tables:
- `global_config` - System-wide settings
- `server_configs` - Per-server overrides
- `guilds` - Joined servers
- `relationships` - Per-user relationship data
- `messages` - Message history
- `bot_replies` - Reply analytics

---

## Common Tasks

### Adding a Feature
1. Determine module location (memory, llm, personality, core, api)
2. Consider prompt impact (`core/prompt.js`)
3. Use relationships for per-user data
4. Add logging via logger utility
5. Add API endpoint in `bot/src/api/server.js` if dashboard integration needed

### Debugging
1. Check `discordllmbot.log` at project root
2. Review `bot/src/events/messageCreate.js` for message flow
3. Check `bot/src/core/replyDecider.js` for reply decisions
4. Use dashboard Logs page for real-time logs

---

## Copilot Instructions

This project has existing Copilot instructions in `.github/copilot-instructions.md`. Agents should follow those architecture and implementation guidelines.
