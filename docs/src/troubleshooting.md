## Troubleshooting

- If Gemini returns `429 Resource exhausted`, check `api.retryAttempts` and `api.retryBackoffMs` in `bot.json` and ensure `GEMINI_API_KEY` has billing/quota enabled.
- If you see repeated avatar update attempts on startup, ensure `bot.username` and `bot.avatarUrl` in `bot.json` match the bot's Discord profile, or let the code update once (it now strips query params when comparing).
- If member population is slow or fails, ensure the bot has the `Server Members Intent` enabled in the Discord Developer Portal.

