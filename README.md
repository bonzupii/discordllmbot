# DiscordLLMBot

DiscordLLMBot is a monorepo for a Discord bot and a React dashboard. The bot generates persona-driven replies using Gemini, Ollama, or Qwen, stores operational data in PostgreSQL, and exposes an API/Socket.io server for dashboard management.

[![GitHub repo](https://img.shields.io/badge/github-discordllmbot-blue)](https://github.com/lnorton89/discordllmbot)

## Monorepo layout

- `bot/` — Discord bot + Express API + Socket.io (TypeScript)
- `dashboard/` — React + Vite + MUI dashboard (TypeScript)
- `shared/` — shared config, storage, and logger utilities
- `docs/` — VitePress documentation project

---

## Core architecture

1. Discord message event enters `bot/src/events/messageCreate.ts`.
2. Bot loads effective config from DB via `shared/config/configLoader.js`.
3. Prompt is built from persona + relationship + channel context + **knowledge graph memory**.
4. LLM provider (`gemini`, `ollama`, or `qwen`) generates reply.
5. Reply is sent to Discord and analytics/context are persisted.

The API server lives inside the bot process (`bot/src/api/server.ts`) and serves dashboard routes under `/api`.

---

## Features & Design

### Persona-driven prompts
Bot persona is defined in global config and injected into every prompt. Customize `username`, `description`, and `globalRules` to control behavior.

### Per-user relationships
When the bot joins a guild it initializes database entries for each human member. Each relationship stores `username`, `displayName`, `attitude`, `behavior`, `boundaries`, and `ignored` flag. The `behavior` field describes how the bot should behave toward the user (e.g., "treat them like a close friend"). These entries are included in prompts so the LLM can tailor replies.

### Contextual memory & knowledge graph
- **Recent channel messages**: Author ID, name, and content stored in PostgreSQL (bounded by `memory.maxMessages` and `maxMessageAgeDays`)
- **Knowledge graph memory**: Long-term memory system that captures and retrieves semantic relationships between concepts, users, and conversations for more contextual responses

### Reply decision logic
`replyBehavior` in server config controls reply decisions:
- `mentionOnly` — Only reply when @mentioned
- `replyProbability` — Chance to reply (0.0–1.0)
- `minDelayMs` / `maxDelayMs` — Human-like response delay
- `ignoreUsers` / `ignoreChannels` / `ignoreKeywords` — Exclusion lists
- `guildSpecificChannels` — Per-guild channel allowed/ignored lists

### Web Dashboard
React-based dashboard (port 5173) with:
- **Settings Page**: Global config with tabs (Bot Persona, LLM, Memory, Logger, Sandbox), auto-save with debouncing
- **Servers Page**: Per-server configuration, user relationships, channel monitoring
- **Logs Page**: Real-time Socket.io log streaming with filtering
- **Playground Page**: Test bot responses without Discord

### Multi-provider LLM support
Unified interface for:
- **Google Gemini API** — Cloud-based LLM
- **Ollama** — Local self-hosted models
- **Qwen API** — Alibaba's LLM with OAuth token management and automatic refresh

### Docker Sandbox
Execute shell commands in isolated containers via Docker-in-Docker. Users can trigger sandbox execution with messages containing "docker command". Commands are extracted via LLM and run in ephemeral Alpine containers within the sandbox Docker daemon.

### RSS Feed Integration
Monitor RSS feeds and post updates to Discord channels automatically.

### PDF Analysis
Upload and analyze PDF documents through the bot or dashboard.

---

## Current configuration model

Configuration is normalized and stored in typed DB columns.

### Global config (`global_config` table)

| Section | Fields |
|---------|--------|
| `botPersona` | `username`, `description`, `globalRules[]` |
| `llm` | `provider` (`gemini` \| `ollama` \| `qwen`), `geminiModel`, `ollamaModel`, `qwenModel`, `retryAttempts`, `retryBackoffMs` |
| `memory` | `maxMessages`, `maxMessageAgeDays` |
| `logger` | `maxLogLines`, `logReplyDecisions`, `logSql` |
| `sandbox` | `enabled`, `timeoutMs`, `allowedCommands[]` |

### Server config (`server_configs` table)

| Field | Description |
|-------|-------------|
| `nickname` | Optional override of global username |
| `speakingStyle[]` | Custom speaking style instructions |
| `replyBehavior` | Reply decision settings |
| `replyBehavior.replyProbability` | Chance to reply (0.0–1.0) |
| `replyBehavior.minDelayMs` | Minimum response delay |
| `replyBehavior.maxDelayMs` | Maximum response delay |
| `replyBehavior.mentionOnly` | Only reply when mentioned |
| `replyBehavior.ignoreUsers[]` | User IDs to ignore |
| `replyBehavior.ignoreChannels[]` | Channel IDs to ignore |
| `replyBehavior.ignoreKeywords[]` | Keywords to ignore |
| `guildSpecificChannels` | Per-guild channel allowed/ignored lists |

### Backward compatibility policy

- Legacy JSON blob config compatibility has been removed.
- If schema/data is incompatible during local development, rebuild/reset DB.

---

## Database schema

Key tables:
- `global_config` — System-wide settings (typed columns)
- `server_configs` — Per-server overrides (typed columns)
- `guilds` — Joined servers
- `relationships` — Per-user relationship data
- `relationship_behaviors` — Behavior definitions for relationships
- `relationship_boundaries` — Boundary definitions for relationships
- `messages` — Message history
- `bot_replies` — Reply analytics
- `knowledge_graph` — Long-term memory nodes and edges

`shared/storage/database.js` defines schema creation.

---

## Reply decision behavior (current)

`bot/src/core/replyDecider.ts` uses:
1. Ignore user/channel/keyword checks
2. Relationship ignored check
3. `mentionOnly` gate
4. Probability roll (`replyProbability`)

Legacy mode-based strategy routing (`active/passive/disabled/mention-only`) is no longer part of the main decision flow.

---

## Environment variables

```bash
# Discord
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# LLM Provider
GEMINI_API_KEY=
OLLAMA_API_URL=
QWEN_API_KEY=

# Optional Qwen OAuth (PKCE device flow)
QWEN_OAUTH_CLIENT_ID=

# PostgreSQL
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_PORT=
DATABASE_URL=

# pgAdmin
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=

# Ports
API_PORT=3000
DASHBOARD_PORT=5173
DOCS_PORT=5174

# Ollama (Docker)
OLLAMA_API_URL=http://host.docker.internal:11434

# Qwen OpenAI-compatible endpoint
QWEN_API_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

---

## Running the bot

### Start all services with Docker

```bash
npm run dev
```

### Rebuild and start

```bash
npm run dev:build
```

### Stop services

```bash
npm run dev:down
```

### Access the services

| Service | URL | Description |
|---------|-----|-------------|
| **Dashboard** | http://localhost:5173 | React admin dashboard |
| **Bot API** | http://localhost:3000 | Express API server |
| **Documentation** | http://localhost:5174 | VitePress docs |
| **pgAdmin** | http://localhost:5050 | PostgreSQL admin |

**Log file**: `discordllmbot.log` — truncated on startup to keep last `maxLogLines`.

---

## Using LLM Providers

### Google Gemini

1. Get API key from [Google AI Studio](https://aistudio.google.com/)
2. Set `GEMINI_API_KEY` in environment or configure via dashboard
3. Select model in dashboard Settings → LLM tab

### Ollama (Local)

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

**Note**: On Windows/Mac, `host.docker.internal` resolves to host. On Linux, use host IP or `--network=host`.

### Qwen

1. **API Key**: Set `QWEN_API_KEY` for direct API access
2. **OAuth (optional)**: Configure `QWEN_OAUTH_CLIENT_ID` for OAuth device flow
3. **Automatic token refresh**: Bot handles 401 errors with OAuth token refresh

---

## Development commands

### Root

```bash
npm run dev              # Start bot, db, dashboard with Docker
npm run dev:build        # Rebuild and start
npm run dev:down         # Stop containers
npm run build            # Build Docker images
npm run docs             # Run docs dev server
npm run docs:generate    # Generate documentation
```

### Bot

```bash
cd bot
npm run dev              # Start with tsx (nodemon in container)
npm run lint
npm run type-check
npm run start            # Run compiled dist/index.js
```

### Dashboard

```bash
cd dashboard
npm run dev              # Start Vite dev server
npm run lint
npm run type-check
npm run build            # Production build
npm run preview          # Preview production build
```

---

## Docker Architecture

The project uses a Docker Compose setup with the following services:

| Service | Image | Ports | Description |
|---------|-------|-------|-------------|
| `db` | postgres:15-alpine | 5432 | PostgreSQL database |
| `db-mcp` | crystaldba/postgres-mcp | — | Database MCP server |
| `bot` | Custom (Node.js) | 3000, 9229 | Discord bot + API |
| `pgadmin` | dpage/pgadmin4 | 5050 | PostgreSQL admin UI |
| `docs` | Custom (Node.js) | 5174 | VitePress documentation |
| `dashboard` | Custom (Node.js) | 5173 | React dashboard |
| `sandbox` | docker:24-dind | 2376 | Docker-in-Docker for sandbox |

All services communicate over a shared `discordllmbot-network` bridge network.

---

## Key implementation notes

### Configuration persistence
All config stored in PostgreSQL (`global_config` and `server_configs`). Dashboard provides real-time editing with auto-save (1-second debounce).

### Relationship persistence
`bot/src/personality/relationships.ts` maintains in-memory caches per guild (`guildRelationships[guildId]`) and persists to PostgreSQL.

### Conversation context
`bot/src/memory/context.ts` maintains per-channel message history in memory and persists to database.

### Knowledge graph
`bot/src/memory/knowledgeGraph.ts` implements long-term memory with node/edge relationships for semantic retrieval.

### Modular API structure
API server is split into modular route files:
- `bot/src/api/routes/` — Individual route handlers
- `bot/src/api/server.ts` — Express app composition
- `bot/src/api/socket.ts` — Socket.io event handlers

### Logging
Use `logger.api()` for external API calls, `logger.message()` for message events, `logger.info()/warn()/error()` for operational logs.

---

## Extending the bot

Suggested next steps:
1. Add new LLM providers in `bot/src/llm/`
2. Extend reply logic in `bot/src/core/replyDecider.ts`
3. Add new dashboard pages in `dashboard/src/pages/`
4. Add new API endpoints in `bot/src/api/routes/`
5. Add new event handlers in `bot/src/events/`
6. Extend knowledge graph memory in `bot/src/memory/`

---

## Troubleshooting

### Common issues

**Dashboard won't connect to bot API**
- Check Docker network configuration
- Verify `API_PROXY_TARGET=http://bot:3000` in dashboard environment
- Check bot service health: `docker ps | grep bot`

**Database connection errors**
- Ensure DB is healthy: `docker-compose ps db`
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL port mapping

**LLM API failures**
- Check API keys in dashboard Settings → LLM
- Verify network connectivity to LLM provider
- Check `discordllmbot.log` for error details

**Sandbox not executing**
- Ensure sandbox service is running: `docker-compose ps sandbox`
- Check `sandbox.enabled` in global config
- Verify Docker-in-Docker health: `docker exec discordllmbot-sandbox docker info`

### Debugging tools

1. **Log file**: `discordllmbot.log`
2. **Dashboard Logs page**: Real-time Socket.io stream
3. **pgAdmin**: http://localhost:5050 — inspect database directly
4. **Bot debug port**: 9229 (attach debugger)

---

## License

See [LICENSE](LICENSE) file.

---

## Recent Updates

- **Knowledge Graph Memory**: Integrated long-term semantic memory system
- **Qwen OAuth**: Automatic token refresh on 401 errors
- **Modular API**: Refactored server.ts into modular route files
- **Docker Networking**: Fixed service discovery and proxy configuration
- **Type Safety**: Added path aliases and centralized constants
- **Socket.io**: Implemented single shared socket pattern, fixed memory leaks

For detailed changelog, see [GitHub Releases](https://github.com/lnorton89/discordllmbot/releases) or `git log`.
