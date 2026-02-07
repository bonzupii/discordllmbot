## Configuration (`src/config/bot.json`)

Important fields:

- `bot`: persona fields
  - `name`, `username`, `description`, `avatarUrl`
  - `speakingStyle`: an array of human-readable style hints
  - `globalRules`: list of rules the bot should always follow
  - `defaultRelationship`: used when initializing per-user entries on guild join

- `memory.maxMessages`: how many messages to keep per-channel in memory

- `api`:
  - `geminiModel`: e.g. `gemini-2.0-flash`
  - `retryAttempts`: integer retries for Gemini client
  - `retryBackoffMs`: base backoff in ms used to scale exponential backoff

- `replyBehavior`: controls the bot's reply decision logic and behavior.
  - `mode`: (`"mention-only"`, `"active"`, `"passive"`, `"disabled"`) — The core toggle for when the bot considers replying:
    - `"mention-only"`: Replies only when explicitly @mentioned.
    - `"active"`: Replies when mentioned, or sometimes proactively joins conversations (e.g., based on recent context, direct questions).
    - `"passive"`: Similar to `"mention-only"`, often used with other stricter rules.
    - `"disabled"`: Bot remains completely silent, observing but never replying.
  - `replyProbability`: (`0.0` - `1.0`) — The chance the bot will reply even when a reply is triggered (e.g., `0.8` means 80% chance).
  - `minDelayMs`, `maxDelayMs`: (`number`) — The minimum and maximum delay (in milliseconds) for a human-like response time.
  - `ignoreUsers`: (`array<string>`) — A list of Discord user IDs the bot should never reply to.
  - `ignoreChannels`: (`array<string>`) — A list of Discord channel IDs where the bot should remain silent.
  - `ignoreKeywords`: (`array<string>`) — A list of keywords or phrases (case-insensitive) that, if present in a message, will prevent the bot from replying.
  - `requireMention`: (`boolean`) — If `true`, the bot *must* be @mentioned to consider replying, even if `mode` is set to `"active"`.
  - `proactiveReplyChance`: (`0.0` - `1.0`) — (Only applies in `"active"` mode) The random chance the bot will proactively reply to a message even if no explicit mention or question is present. A value of `0.05` means a 5% chance.

- `logger.maxLogLines`: integer, how many lines to keep from previous log when starting

See [src/config/bot.json](src/config/bot.json) for defaults.

