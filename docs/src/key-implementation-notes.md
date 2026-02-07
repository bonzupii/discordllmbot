## Key Implementation Notes

- Relationship persistence: `src/personality/relationships.js` maintains in-memory caches per guild (`guildRelationships[guildId]`) and saves to `data/<Guild Name>/relationships.json` using the persistence layer. Relationships include per-user `username`, `displayName`, `attitude`, `behavior`, and `boundaries`.

- Conversation context: `src/memory/context.js` maintains per-channel message history in memory (`guildContexts[guildId][channelId]`) and persists to `data/<Guild Name>/contexts/<channelName>.json` (human-readable filenames).

- Event handling: `src/events/` contains all Discord event handlers separated from main application logic for better modularity.

- Member enumeration: the bot requests the `Guild Members` intent and will attempt to `guild.members.fetch()` on startup/guild join to populate per-user relationship entries. If fetch fails (or is disabled) it falls back to cached members.

- Logging: prefer `logger.api()` for external API calls (Gemini and Discord profile updates), `logger.message()` for message-level events (mentions/replies), and `logger.info()/warn()/error()` for operational logs.

