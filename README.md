# DiscordLLMBot

DiscordLLMBot is a monorepo for a Discord bot and a React dashboard. The bot generates persona-driven replies using Gemini or Ollama, stores operational data in PostgreSQL, and exposes an API/Socket.io server for dashboard management.

## Monorepo layout

- `bot/` — Discord bot + Express API + Socket.io (TypeScript)
- `dashboard/` — React + Vite + MUI dashboard (TypeScript)
- `shared/` — shared config, storage, and logger utilities
- `docs/` — VitePress documentation project

---

## Core architecture

1. Discord message event enters `bot/src/events/messageCreate.ts`.
2. Bot loads effective config from DB via `shared/config/configLoader.js`.
3. Prompt is built from persona + relationship + channel context.
4. LLM provider (`gemini` or `ollama`) generates reply.
5. Reply is sent to Discord and analytics/context are persisted.

The API server lives inside the bot process (`bot/src/api/server.ts`) and serves dashboard routes under `/api`.

---

## Features & Design

- **Persona-driven prompts**: Bot persona is defined in global config and injected into every prompt. Customize `username`, `description`, and `globalRules` to control behavior.

- **Per-user relationships**: When the bot joins a guild it initializes database entries for each human member. Each relationship stores `username`, `displayName`, `attitude`, `behavior`, `boundaries`, and `ignored` flag. These entries are included in prompts so the LLM can tailor replies.

- **Contextual memory**: Recent channel messages (authorId, author name, content) are stored in PostgreSQL (bounded by `memory.maxMessages` and `maxMessageAgeDays`).

- **Reply decision logic**: `replyBehavior` in server config controls reply decisions:
  - `mentionOnly` - Only reply when @mentioned
  - `replyProbability` - Chance to reply (0.0-1.0)
  - `minDelayMs` / `maxDelayMs` - Human-like response delay
  - `ignoreUsers` / `ignoreChannels` / `ignoreKeywords` - Exclusion lists
  - `guildSpecificChannels` - Per-guild channel allowed/ignored lists

- **Web Dashboard**: React-based dashboard (port 5173) with:
  - **Settings Page**: Global config with tabs (Bot Persona, LLM, Memory, Logger, Sandbox), auto-save with debouncing
  - **Servers Page**: Per-server configuration, user relationships, channel monitoring
  - **Logs Page**: Real-time Socket.io log streaming with filtering
  - **Playground Page**: Test bot responses without Discord

- **Multi-provider LLM support**: Unified interface for Google's Gemini API, local Ollama models, and Qwen API with OAuth.

- **Docker Sandbox**: Execute shell commands in isolated containers via Docker-in-Docker. Users can trigger sandbox execution with messages containing "docker command". Commands are extracted via LLM and run in ephemeral Alpine containers within the sandbox Docker daemon.

---

## Current configuration model

Configuration is now normalized and stored in typed DB columns.

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

### Backward compatibility policy

- Legacy JSON blob config compatibility has been removed.
- If schema/data is incompatible during local development, rebuild/reset DB.

---

## Database schema

Key tables:
- `global_config` - System-wide settings (typed columns)
- `server_configs` - Per-server overrides (typed columns)
- `guilds` - Joined servers
- `relationships` - Per-user relationship data
- `messages` - Message history
- `bot_replies` - Reply analytics

`shared/storage/database.js` defines schema creation.

---

## Reply decision behavior (current)

`bot/src/core/replyDecider.ts` now uses:

- ignore user/channel/keyword checks,
- relationship ignored check,
- `mentionOnly` gate,
- probability roll (`replyProbability`).

Legacy mode-based strategy routing (`active/passive/disabled/mention-only`) is no longer part of the main decision flow.

---

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

---

## Running the bot

```bash
# Start all services with Docker
npm run dev

# Or build and start
npm run dev:build
```

Access the services:
- **Dashboard**: http://localhost:5173
- **Bot API**: http://localhost:3000
- **Documentation**: http://localhost:5174
- **pgAdmin**: http://localhost:5050

Log file: `discordllmbot.log` — truncated on startup to keep last `maxLogLines`.

---

## Using Ollama Provider

1. **Install and run Ollama** on your host machine:
   ```bash
   ollama serve
   ```

2. **Pull a model**:
   ```bash
   ollama pull llama3.2
   ```

3. **Configure via dashboard** or set in config:
   ```json
   {
     "llm": {
       "provider": "ollama",
       "ollamaModel": "llama3.2"
     }
   }
   ```

4. **Set environment variable**:
   ```
   OLLAMA_API_URL=http://host.docker.internal:11434
   ```

Note: On Windows/Mac, `host.docker.internal` resolves to host. On Linux, use host IP or `--network=host`.

---

## Key implementation notes

- **Configuration persistence**: All config stored in PostgreSQL (`global_config` and `server_configs`). Dashboard provides real-time editing with auto-save.

- **Relationship persistence**: `bot/src/personality/relationships.ts` maintains in-memory caches per guild (`guildRelationships[guildId]`) and persists to PostgreSQL.

- **Conversation context**: `bot/src/memory/context.ts` maintains per-channel message history in memory and persists to database.

- **Event handling**: `bot/src/events/` contains Discord event handlers.

- **Logging**: Use `logger.api()` for external API calls, `logger.message()` for message events, `logger.info()/warn()/error()` for operational logs.

---

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

---

## Extending the bot

Suggested next steps:
1. Add new LLM providers in `bot/src/llm/`
2. Extend reply logic in `bot/src/core/replyDecider.ts`
3. Add new dashboard pages in `dashboard/src/pages/`
4. Add new API endpoints in `bot/src/api/server.ts`
