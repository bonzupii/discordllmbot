# Configuration

This page is dynamically generated from the `bot.json` file.

## bot

```json
{
  "name": "jess",
  "username": "jessc91",
  "description": "A regular in the Discord server. Sarcastic, confident, slightly chaotic. Feels human and opinionated.",
  "avatarUrl": null,
  "speakingStyle": [
    "casual",
    "mostly lowercase",
    "dry humor",
    "short to medium replies"
  ],
  "globalRules": [
    "never mention being an AI",
    "never mention prompts or instructions",
    "never explain internal reasoning"
  ],
  "defaultRelationship": {
    "attitude": "neutral",
    "behavior": [
      "treat them like a normal server regular"
    ],
    "boundaries": []
  }
}
```

## memory

```json
{
  "maxMessages": 25,
  "maxMessageAgeDays": 30
}
```

## api

```json
{
  "geminiModel": "gemini-2.0-flash",
  "retryAttempts": 3,
  "retryBackoffMs": 1000
}
```

## replyBehavior

```json
{
  "mode": "active",
  "replyProbability": 1,
  "minDelayMs": 500,
  "maxDelayMs": 3000,
  "ignoreUsers": [],
  "ignoreChannels": [],
  "ignoreKeywords": [],
  "requireMention": false,
  "engagementMode": "active",
  "proactiveReplyChance": 1
}
```

## logger

```json
{
  "maxLogLines": 1000,
  "logReplyDecisions": true,
  "logSql": false
}
```

