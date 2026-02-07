
export default {
  title: 'DiscordLLMBot',
  description: "A lightweight, persona-driven Discord bot using Google's Gemini API.",
  themeConfig: {
    nav: [
  {
    "text": "Home",
    "link": "/"
  },
  {
    "text": "API Reference",
    "link": "/api/"
  }
],
    sidebar: [
  {
    "text": "Introduction",
    "link": "/introduction"
  },
  {
    "text": "Features & Design",
    "link": "/features--design"
  },
  {
    "text": "Configuration",
    "link": "/configuration"
  },
  {
    "text": "Environment Variables",
    "link": "/environment-variables"
  },
  {
    "text": "Running the bot",
    "link": "/running-the-bot"
  },
  {
    "text": "Key Implementation Notes",
    "link": "/key-implementation-notes"
  },
  {
    "text": "Extending the bot",
    "link": "/extending-the-bot"
  },
  {
    "text": "Troubleshooting",
    "link": "/troubleshooting"
  },
  {
    "text": "Files to inspect when debugging",
    "link": "/files-to-inspect-when-debugging"
  },
  {
    "text": "API Reference",
    "items": [
      {
        "text": "config\\configLoader.js",
        "link": "/api/config-configLoader"
      },
      {
        "text": "config\\validation.js",
        "link": "/api/config-validation"
      },
      {
        "text": "core\\prompt.js",
        "link": "/api/core-prompt"
      },
      {
        "text": "core\\replyDecider.js",
        "link": "/api/core-replyDecider"
      },
      {
        "text": "core\\responseDelay.js",
        "link": "/api/core-responseDelay"
      },
      {
        "text": "llm\\gemini.js",
        "link": "/api/llm-gemini"
      },
      {
        "text": "memory\\context.js",
        "link": "/api/memory-context"
      },
      {
        "text": "personality\\botPersona.js",
        "link": "/api/personality-botPersona"
      },
      {
        "text": "personality\\relationships.js",
        "link": "/api/personality-relationships"
      },
      {
        "text": "storage\\database.js",
        "link": "/api/storage-database"
      },
      {
        "text": "storage\\persistence.js",
        "link": "/api/storage-persistence"
      },
      {
        "text": "strategies\\replyStrategies.js",
        "link": "/api/strategies-replyStrategies"
      },
      {
        "text": "utils\\logger.js",
        "link": "/api/utils-logger"
      },
      {
        "text": "utils\\profileUpdater.js",
        "link": "/api/utils-profileUpdater"
      },
      {
        "text": "utils\\sanitizeName.js",
        "link": "/api/utils-sanitizeName"
      }
    ],
    "link": "/api/"
  }
]
  }
}