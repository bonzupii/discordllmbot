## Features & Design

- Persona-driven prompts: the bot persona is defined in `src/config/bot.json` and injected into every prompt. Customize `name`, `description`, `speakingStyle`, and `globalRules` to control how the bot behaves.

- Per-user relationships: when the bot joins a guild it initializes `data/relationships.json` entries for each human member using `bot.defaultRelationship` from `bot.json`. Each relationship stores `username`, `displayName`, `attitude`, `behavior`, and `boundaries`. These entries are included (compactly) in prompts so the LLM can tailor replies.

- Contextual memory: recent channel messages (authorId, author name, content) are kept in memory (bounded by `memory.maxMessages`) and persisted per-channel in `data/contexts/`.

- Reply decision logic: Phase A/B implemented
  - `replyBehavior` in `bot.json` controls how the bot decides whether to reply (modes: `mention-only`, `active`, `passive`, `disabled`), `replyProbability`, delay window, ignore lists, and keywords.
  - Strategy pattern (`src/strategies/replyStrategies.js`) provides `MentionOnly`, `Passive`, `Active`, and `Disabled` strategies. `ActiveStrategy` looks at recent context and simple heuristics.

- Gemini client: `src/llm/gemini.js` sends prompts to Gemini REST API with configurable `api.geminiModel`, `api.retryAttempts`, and `api.retryBackoffMs`. The client honors `Retry-After` headers for rate-limited responses.

- Structured logging: `src/utils/logger.js` writes multi-level logs to both console and `discordllmbot.log`. The log file is truncated to the last `logger.maxLogLines` on startup (configurable in `bot.json`). Specialized log levels: `API`, `MESSAGE`, `INFO`, `WARN`, `ERROR`.

- Dev watcher: `scripts/watch-restart.js` restarts the bot on changes in `src/` and appends restart markers to the log so you can inspect where a restart occurred.

