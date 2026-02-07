## # DiscordLLMBot

DiscordLLMBot is a lightweight Discord bot that uses Google's Gemini (Generative AI) REST API to generate contextual, persona-driven replies inside Discord servers. It is designed as a configurable MVP with a PostgreSQL database for persistence, and developer-friendly tooling (Docker-based development environment).

---

**Repository layout**

- `src/` — application source
  - `index.js` — main entry point and event loop (thin: just setup + event registration)
  - `llm/gemini.js` — Gemini REST client with retry/backoff
  - `storage/` — PostgreSQL database interaction
    - `database.js` — connection and schema setup
    - `persistence.js` — data access layer (CRUD operations)
    - `lock.js` — schema setup locking mechanism
  - `personality/` — persona and relationships handling
    - `botPersona.js` — loads bot identity and speaking style
    - `relationships.js` — per-guild, per-user relationship store and initialization
  - `core/` — business logic (moved from utils/)
    - `prompt.js` — builds prompts for Gemini from persona, relationship, and context
    - `replyDecider.js` — decision logic (Phase A/B) for when to reply
    - `responseDelay.js` — human-like delay calculation
  - `events/` — event handlers (moved from index.js)
    - `clientReady.js` — bot ready event handler
    - `messageCreate.js` — message handling and reply logic
    - `guildCreate.js` — guild join event handler
    - `guildMemberAdd.js` — member join event handler
    - `index.js` — event loader
  - `utils/` — helper utilities (logger, profileUpdater, sanitizeName only)
    - `logger.js` — structured logger (file + console)
    - `profileUpdater.js` — sync Discord profile (username/avatar) with config
    - `sanitizeName.js` — sanitize names for Windows-safe filenames
  - `config/` — configuration
    - `bot.json` — main config (persona, memory, api, replyBehavior, logger)
- `docs/` — Documentation
  - `src/` — VitePress source files
  - `package.json` — Documentation dependencies and scripts
- `data/` — runtime persisted data (mounted Docker volumes)
  - `postgres/` — PostgreSQL database files
  - `pgadmin/` — pgAdmin 4 data
- `scripts/` — helper scripts
  - `watch-restart.js` — dev watcher that restarts the bot on `src/` changes and writes restart markers to the log
- `discordllmbot.log` — runtime log file (rotated/truncated on startup)
- `package.json` — npm scripts and metadata

