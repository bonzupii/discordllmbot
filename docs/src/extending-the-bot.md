## Extending the bot

Suggested next steps you can implement:

- Admin commands: add Discord commands for admins to inspect and edit `relationships.json` entries in-chat (eg. `!rel set <userId> <json>`).
- Per-guild override UI: add a simple web dashboard or CLI to manage `replyBehavior` and `defaultRelationship` per-guild.
- More advanced reply strategies: add context-aware scoring, conversation topic detection, and rate-limiting heuristics.
- Tests: add unit tests for `replyDecider`, `responseDelay`, and `prompt` to validate behavior.

