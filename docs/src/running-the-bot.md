## Running the bot

Install dependencies and run:

```bash
docker-compose up --build
```

During development, the `app` service is configured with a mounted volume and `nodemon` for automatic restarts on code changes.

Data storage: When the bot starts or joins a server, it automatically creates a per-guild folder (`data/<Server Name>/`) and populates:
- `relationships.json` — per-user relationship entries for the guild
- `contexts/<channelId>.json` — per-channel message history files

Log file: `discordllmbot.log` — the watcher writes restart markers and the logger truncates the file on startup to keep the last `logger.maxLogLines` (configurable in `bot.json`).

