# DiscordLLMBot

DiscordLLMBot is a lightweight Discord bot that uses Google's Gemini (Generative AI) REST API or Ollama to generate contextual, persona-driven replies inside Discord servers. It is designed as a configurable MVP with a PostgreSQL database for persistence, a web dashboard for management, and developer-friendly tooling (Docker-based development environment).

---

## Repository Layout

This is a monorepo containing:

- `bot/` — Discord bot application (Node.js, ES modules)
  - `src/` — application source
  - `Dockerfile.bot` — Docker configuration for the bot
  
- `dashboard/` — Vite + React + TypeScript frontend dashboard (MUI)
  - `Dockerfile.dashboard` — Docker configuration for the dashboard
  
- `shared/` — common logic and configuration used by bot and dashboard
  - `storage/` — PostgreSQL connection and persistence
  - `config/` — Configuration loading and validation
  - `utils/` — Logger and shared utilities
  
- `docs/` — Documentation (VitePress)
  - `src/` — VitePress source files
  - `Dockerfile.docs` — Docker configuration for the documentation server

- `data/` — runtime persisted data (mounted Docker volumes)
  - `postgres/` — PostgreSQL database files
  - `pgadmin/` — pgAdmin 4 data

- `package.json` — root package.json for monorepo workspaces and scripts

---

## Features & Design

- **Persona-driven prompts**: the bot persona is defined in the database (`global_config` table) and injected into every prompt. Customize via the dashboard or directly in the database: `name`, `description`, `speakingStyle`, and `globalRules`.

- **Per-user relationships**: when the bot joins a guild it initializes database entries for each human member. Each relationship stores `username`, `displayName`, `attitude`, `behavior`, `boundaries`, and `ignored`. These entries are included in prompts so the LLM can tailor replies.

- **Contextual memory**: recent channel messages are stored in PostgreSQL (bounded by `memory.maxMessages`).

- **Reply decision logic**:
  - `replyBehavior` controls how the bot decides whether to reply (modes: `mention-only`, `active`, `passive`, `disabled`), `replyProbability`, delay window, ignore lists, and keywords.
  - Strategy pattern (`bot/src/strategies/replyStrategies.js`) provides `MentionOnly`, `Passive`, `Active`, and `Disabled` strategies.

- **Web Dashboard**: A React-based dashboard (running on port 5173) allows you to view logs, manage relationships, and configure the bot:
  - **Dashboard Page**: Stats (24h replies, active servers/users, tokens), 7-day activity volume, top servers, system health (CPU/memory/uptime)
  - **Settings Page**: Global config with tabs (Bot Persona, LLM, Memory, Logger), auto-save debouncing, accordion sections for speaking style and global rules
  - **Servers Page**: Server list with expandable rows, 3 tabs per server (Server Config, User Relationships, Channel Monitoring)
  - **Logs Page**: Real-time Socket.io streaming, filter by level, auto-scroll toggle, JSON parsing
  - **Playground Page**: Test bot responses in a chat interface without affecting Discord servers

- **Multi-provider LLM support**: Unified interface for both Google's Gemini API and local Ollama models.

---

## Configuration

All configuration is stored in PostgreSQL database tables:

### Global Configuration (`global_config` table)
- **`bot`**: Persona settings
  - `name` — Bot's persona name (used in prompts)
  - `username` — Discord username (for profile sync)
  - `description` — Global persona description
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
All global fields PLUS:
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

**Use the dashboard** (Settings page for global, Servers page for per-server) to modify configuration. Changes auto-save with 1-second debouncing.

---

## Environment Variables

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

## Running the Bot

### Development (recommended)
```bash
npm run dev           # Start bot, db, dashboard with Docker
npm run dev:build     # Rebuild and start
npm run dev:down      # Stop containers
```

### Production
```bash
npm run build         # Build Docker images
```

Access the services:
- **Dashboard**: http://localhost:5173
- **Bot API**: http://localhost:3000 (Express + Socket.io for dashboard)
- **Documentation**: http://localhost:5174
- **pgAdmin**: http://localhost:5050 (Login with email/password from .env)

During development, the `bot` service is configured with mounted volumes and `nodemon` for automatic restarts on code changes.

Log file: `discordllmbot.log` — the logger truncates the file on startup to keep the last `logger.maxLogLines`.

---

## Using Ollama Provider

To use Ollama instead of Google's Gemini API:

1. **Install and run Ollama** on your host machine:
   ```bash
   ollama serve
   ```

2. **Pull the model you want to use**:
   ```bash
   ollama pull llama3.2
   ```

3. **Configure the bot** via the Dashboard Settings page:
   - Set API Provider to "ollama"
   - Set Ollama Model to "llama3.2"
   
   Or update directly in the database (`global_config` table):
   ```json
   {
     "api": {
       "provider": "ollama",
       "ollamaModel": "llama3.2"
     }
   }
   ```

4. **Update your .env file**:
   ```
   OLLAMA_API_URL=http://host.docker.internal:11434
   ```

5. **Restart the bot**:
   ```bash
   npm run dev:down && npm run dev
   ```

Note: When using Docker on Windows/Mac, `host.docker.internal` is the special DNS name that resolves to the host machine.

---

## Key Implementation Notes

- **Configuration persistence**: All configuration (global and per-server) is stored in PostgreSQL (`global_config` and `server_configs` tables). The dashboard provides real-time editing with auto-save (1-second debounce).

- **Relationship persistence**: `bot/src/personality/relationships.js` maintains in-memory caches per guild (`guildRelationships[guildId]`) and persists to PostgreSQL.

- **Conversation context**: `bot/src/memory/context.js` maintains per-channel message history in memory and persists to the database.

- **Event handling**: `bot/src/events/` contains all Discord event handlers separated from main application logic.

- **Member enumeration**: the bot requests the `Guild Members` intent and fetches members on startup/guild join.

- **Logging**: Use `logger.api()` for external API calls, `logger.message()` for message-level events, and `logger.info()/warn()/error()` for operational logs.

---

## Extending the Bot

Suggested next steps:

- **Admin commands**: add Discord commands for admins to inspect and edit relationships in-chat
- **More advanced reply strategies**: add context-aware scoring, conversation topic detection, and rate-limiting heuristics
- **Tests**: add unit tests for `replyDecider`, `responseDelay`, and `prompt`
- **Enhanced Dashboard**: Add more visualizations and analytics
- **User Permissions**: Add role-based access controls to restrict certain dashboard features

---

## Troubleshooting

- If Gemini returns `429 Resource exhausted`, check retry settings in the dashboard and ensure your API key has billing/quota enabled.
- If Ollama returns connection errors, ensure `OLLAMA_API_URL` is accessible and Ollama service is running.
- If you see repeated avatar update attempts on startup, ensure the username in config matches the bot's Discord profile.
- If member population is slow or fails, ensure the bot has the `Server Members Intent` enabled in the Discord Developer Portal.

---

## Files to Inspect When Debugging

- [bot/src/index.js](bot/src/index.js) — Main entry point
- [bot/src/events/](bot/src/events/) — Discord event handlers
- [bot/src/api/server.js](bot/src/api/server.js) — Express + Socket.io API for dashboard
- [bot/src/core/](bot/src/core/) — Business logic (prompt, reply decision, delay)
- [bot/src/llm/](bot/src/llm/) — LLM provider implementations (Gemini, Ollama)
- [shared/utils/logger.js](shared/utils/logger.js) — Structured logging
- [bot/src/personality/relationships.js](bot/src/personality/relationships.js) — Per-user relationship management
- [shared/config/configLoader.js](shared/config/configLoader.js) — Configuration loading
- `discordllmbot.log` — Application log file at project root
