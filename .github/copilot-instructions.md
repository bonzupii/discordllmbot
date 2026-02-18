# Copilot Instructions for DiscordLLMBot

## 1. Architecture Overview

This is a monorepo containing:
- **bot/** - Discord bot with Express API (Node.js, ES modules)
- **dashboard/** - React dashboard with TypeScript, Vite, MUI
- **shared/** - Common utilities (database, config, logging)
- **docs/** - Documentation site

This is a Discord bot that generates contextual replies using LLM APIs (Google Gemini or Ollama). The bot maintains a human personality and can customize behavior per user and per server. The entire environment is containerized using Docker Compose.

**Data Flow:**
1. User mentions bot → Message stored in **PostgreSQL database**.
2. Prompt builder combines: bot persona + user relationship (from DB) + conversation context (from DB).
3. LLM API (Gemini/Ollama) generates reply → Bot responds in Discord.

**Container Architecture:**
- **Single Bot Container:** The bot and API run in the same container (`bot` service). There is no separate `api` container.
- **Port 3000:** The Express + Socket.io API server runs on port 3000 within the bot container.
- **Shared State:** The API has direct access to the Discord client and all bot state (no internal HTTP calls needed).

---

## 2. Build, Lint, and Test Commands

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
npm run lint          # ESLint
npm run start         # Start bot: node src/index.js
npm run dev:container # Dev with nodemon + debug port 9229
```

### Dashboard (React + TypeScript)
```bash
cd dashboard
npm run dev           # Start Vite dev server (port 5173)
npm run build         # Production build
npm run lint          # ESLint (TypeScript + React)
npm run type-check    # TypeScript: tsc --noEmit
npm run preview       # Preview production build
```

---

## 3. Code Style Guidelines

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

## 4. File Organization

```
bot/
  src/
    index.js                           # Main entry point (Discord client + event registration)
    api/
      server.js                        # Express + Socket.io API for dashboard (port 3000)
    llm/
      index.js                         # Unified LLM provider interface
      gemini.js                        # Google Gemini API with retry logic
      ollama.js                        # Ollama local models with retry logic
    memory/
      context.js                       # Channel-specific history + persistence
    personality/
      botPersona.js                    # Bot identity configuration
      relationships.js                 # Per-user relationship management
    core/
      prompt.js                        # Builds prompts for LLM
      replyDecider.js                  # Strategy-based reply decision logic
      responseDelay.js                 # Human-like delay calculation
    strategies/
      replyStrategies.js               # MentionOnly, Passive, Active, Disabled strategies
    events/
      clientReady.js                   # Bot ready event handler
      messageCreate.js                 # Message handling and reply logic
      guildCreate.js                   # Guild join event handler
      guildMemberAdd.js                # Member join event handler
      leaveGuild.js                    # Leave guild handler (API endpoint)
      index.js                         # Event loader
    utils/
      profileUpdater.js                # Sync Discord profile with config
      sanitizeName.js                  # Sanitize names for filesystem use
shared/
  storage/
    database.js                        # PostgreSQL connection + schema setup
    persistence.js                     # Data access layer (CRUD operations)
    lock.js                            # Schema setup race condition prevention
  config/
    bot.json.defaults                  # Default configuration template
    configLoader.js                    # Config loading (global + per-server from DB)
    validation.js                      # Environment variable validation
  utils/
    logger.js                          # 5-level structured logging (file + console)
dashboard/
  src/
    pages/                            # Route pages (Dashboard, Settings, Servers, etc.)
    components/                        # Reusable UI components
    hooks/                            # Custom React hooks
    services/                          # API calls to bot
    theme.ts                           # MUI dark theme

docker-compose.yml                     # Container orchestration (bot, db, pgadmin, docs, dashboard)
```

---

## 5. Module Responsibilities

- **`bot/src/index.js`**: Discord client setup, event registration, graceful shutdown (SIGINT/SIGTERM)
- **`bot/src/api/server.js`**: Express + Socket.io API serving the dashboard (health, config, relationships, logs, analytics, playground)
- **`bot/src/llm/index.js`**: Unified interface for Gemini and Ollama providers
- **`bot/src/llm/gemini.js`**: Gemini API calls with exponential backoff retry logic
- **`bot/src/llm/ollama.js`**: Ollama API calls with exponential backoff retry logic
- **`bot/src/memory/context.js`**: Per-channel message history (in-memory cache + PostgreSQL persistence)
- **`bot/src/personality/relationships.js`**: Per-user relationship management (in-memory cache + PostgreSQL persistence)
- **`bot/src/core/prompt.js`**: Builds prompts combining persona, relationships, and context
- **`bot/src/core/replyDecider.js`**: Strategy-based reply decision logic with configurable checks
- **`bot/src/core/responseDelay.js`**: Human-like random delay calculation
- **`bot/src/strategies/replyStrategies.js`**: Reply strategies (MentionOnly, Passive, Active, Disabled)
- **`shared/storage/persistence.js`**: All database CRUD operations
- **`shared/config/configLoader.js`**: Loads global and per-server configuration from PostgreSQL
- **`shared/utils/logger.js`**: 5-level logging (API, MESSAGE, INFO, WARN, ERROR) to file and console

---

## 6. Configuration System

All configuration is stored in PostgreSQL database tables:
- **`global_config`** — System-wide settings (bot persona, API, memory, logger)
- **`server_configs`** — Per-server overrides (includes `replyBehavior`)

### Global Configuration (`global_config` table)
- **`bot`**: Persona settings
  - `name` — Bot's persona name (used in prompts)
  - `username` — Discord username (for profile sync)
  - `description` — Global persona description (shared across all servers)
  - `speakingStyle` — Array of style descriptors
  - `globalRules` — Array of rules the bot always follows
  - `defaultRelationship` — Template for new user relationships
- **`memory`**: Memory management
  - `maxMessages` — Messages to keep per channel (default: 25)
  - `maxMessageAgeDays` — Maximum message age in days (default: 30)
- **`api`**: LLM provider settings
  - `provider` — "gemini" or "ollama"
  - `geminiModel` — e.g., "gemini-2.0-flash"
  - `ollamaModel` — e.g., "llama3.2"
  - `retryAttempts` — Number of retry attempts (default: 3)
  - `retryBackoffMs` — Base backoff in ms (default: 1000)
- **`logger`**: Logging configuration
  - `maxLogLines` — Log file truncation limit (default: 1000)
  - `logReplyDecisions` — Log reply decision reasoning (default: false)
  - `logSql` — Log SQL queries (default: false)

### Per-Server Configuration (`server_configs` table)
- All global fields PLUS:
- **`replyBehavior`**: Reply decision logic
  - `mode` — "mention-only", "active", "passive", "disabled"
  - `replyProbability` — 0.0 to 1.0 chance to reply (default: 1.0)
  - `minDelayMs`, `maxDelayMs` — Response delay range (default: 500-3000ms)
  - `ignoreUsers` — Array of user IDs to ignore
  - `ignoreChannels` — Array of channel IDs to ignore (global)
  - `ignoreKeywords` — Array of keywords to ignore
  - `requireMention` — Must be @mentioned to reply (default: true)
  - `engagementMode` — "passive" or "active"
  - `proactiveReplyChance` — Chance to reply proactively in active mode (default: 0.05)
  - `guildSpecificChannels` — Per-guild channel allowed/ignored lists

---

## 7. Reply Decision Logic

The `shouldReply()` function in `replyDecider.js` performs these checks in order:

1. **Mode check** — If `disabled`, never reply
2. **Ignore lists** — Check user, channel, keywords
3. **Guild-specific channels** — Check allowed/ignored channels per server
4. **Relationship ignored** — Check per-user `ignored` flag
5. **Strategy selection** — Apply mode-based strategy (mention-only/passive/active)
6. **Mention requirement** — If `requireMention` && not mentioned && not active mode
7. **Probability roll** — Random check against `replyProbability`

---

## 8. Environment Variables

Required environment variables (via `.env`):

```bash
# Discord
DISCORD_TOKEN=              # From Discord Developer Portal
DISCORD_CLIENT_ID=          # For OAuth invite URL

# LLM Provider (choose one)
GEMINI_API_KEY=             # Required when using Gemini
OLLAMA_API_URL=             # http://host.docker.internal:11434 for Ollama

# PostgreSQL
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
DATABASE_URL=               # Full connection string
POSTGRES_PORT=

# pgAdmin
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=

# Ports
API_PORT=3000               # Bot API port
DASHBOARD_PORT=5173         # Dashboard port
DOCS_PORT=5174              # Documentation port
```

---

## 9. Key Implementation Patterns

- **Nullish Coalescing:** Always use `??` for default values, not `||`
- **Verb-first Function Names:** `buildPrompt`, `getRelationship`, `saveRelationships`
- **Context Slicing:** `.slice(0, -1)` to remove triggering message from context
- **Persistence Layer:** All DB ops through `shared/storage/persistence.js`
- **Strategy Pattern:** Reply strategies are pure functions
- **Exponential Backoff:** Retry logic with jitter in LLM calls
- **Lock Mechanism:** `shared/storage/lock.js` prevents race conditions during schema setup
- **In-memory Cache:** `guildRelationships` and `guildContexts` with DB persistence
- **Debounced Auto-save:** Dashboard settings save after 1-second delay to prevent API spam

---

## 10. Dashboard Features

| Page | Features |
|------|----------|
| **Dashboard** | Stats (24h replies, active servers/users, tokens), 7-day activity volume, top servers, system health (CPU/memory/uptime) |
| **Settings** | Global config with tabs (Bot Persona, LLM, Memory, Logger), auto-save debouncing, accordion sections for speaking style and global rules |
| **Servers** | Server list with expandable rows, 3 tabs per server (Server Config, User Relationships, Channel Monitoring), per-server config editing with debounced save |
| **Logs** | Real-time Socket.io streaming, filter by level (ERROR, WARN, API, INFO, MESSAGE), auto-scroll toggle, JSON parsing with accordion details |
| **Playground** | Chat interface to test bot responses, token usage display, clear chat function |

---

## 11. Database Schema

```sql
guilds (guildId PK, guildName)
relationships (guildId FK, userId, attitude, username, displayName, avatarUrl, ignored)
relationship_behaviors (id, guildId FK, userId, behavior)
relationship_boundaries (id, guildId FK, userId, boundary)
messages (id, guildId FK, channelId, authorId, authorName, content, timestamp)
bot_replies (id, guildId FK, channelId, userId, username, displayName, avatarUrl, userMessage, botReply, processingTimeMs, promptTokens, responseTokens, timestamp)
server_configs (guildId PK FK, config JSONB, createdAt, updatedAt)
global_config (id PK DEFAULT 'global', config JSONB, createdAt, updatedAt)
```

---

## 12. Log Analysis

- When diagnosing issues, check the `discordllmbot.log` file at the project root.
- This log is recreated on each bot startup (truncated to `logger.maxLogLines`).
- Log levels: `[API]`, `[MESSAGE]`, `[INFO]`, `[WARN]`, `[ERROR]`
- API logs include LLM model, function names, and Discord API calls.

---

## 13. Common Tasks

### Adding a New Feature
1. Determine location (which module: `memory`, `llm`, `personality`, `core`, `api`)
2. Consider prompt impact (does `prompt.js` need updating?)
3. Consider user-specificity (use `relationships.js` for per-user data)
4. Add logging via `logger` utility
5. Add API endpoints in `bot/src/api/server.js` if dashboard integration needed
6. Update dashboard component if UI exposure needed

### Debugging
1. Check `discordllmbot.log` for errors and API traces
2. Review `bot/src/events/messageCreate.js` for message flow
3. Check `bot/src/core/replyDecider.js` for reply decision logic
4. Use dashboard Logs page for real-time logs
5. Verify configuration in database (use pgAdmin or queries)

### Configuration Changes
- Use the dashboard Settings page for global config
- Use the dashboard Servers page for per-server config
- Changes auto-save with 1-second debouncing
- Config is loaded from PostgreSQL on startup and cached (5-minute TTL for server configs)
