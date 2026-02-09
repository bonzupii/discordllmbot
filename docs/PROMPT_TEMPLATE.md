# Copilot Prompt Template for DiscordLLMBot

## How to Use This Template

Copy and paste the relevant sections of this template into your chat with Copilot to provide clear, consistent, and context-rich requests. This template is designed to work with the guided workflow defined in `.clinerules`.

---

### Template: General Task or Feature Request

````markdown
**1. My Goal:**
I want to [describe the feature or task in one sentence].

**2. The Task in Detail:**
[Provide a clear, step-by-step description of what you want to achieve. Be specific. For example: "I want to add a new slash command that allows a user to see their current relationship settings with the bot."]

**3. Key Files to Modify:**
[List the files you think will be affected. If you're unsure, you can say "I'm not sure, please analyze the codebase to identify the correct files."]
- `bot/src/events/interactionCreate.js` (new file)
- `bot/src/personality/relationships.js`
- `bot/src/core/prompt.js` (if the prompt needs to change)

**4. Acceptance Criteria (How I'll know it's done):**
- [ ] A new slash command `/my-relationship` is available.
- [ ] When a user runs the command, the bot replies with an ephemeral message showing their current `attitude`, `behavior`, and `boundaries`.
- [ ] The command is handled in a new `interactionCreate.js` event handler.

**5. Workflow Step:**
This is the [first/next/final] step in our current session. Please [create a new session file / update the current session file] to reflect this task.
````

---

### Template: Bug Fix Request

````markdown
**1. The Bug:**
[Describe the bug clearly. For example: "The bot is crashing when it receives a message with an attachment."]

**2. How to Reproduce:**
1. Go to any channel where the bot is present.
2. Send a message with an image attachment and mention the bot.
3. Observe the bot crashing and restarting (or check the logs for an error).

**3. Expected Behavior:**
The bot should either ignore the attachment or acknowledge it, but it should not crash.

**4. Log Analysis:**
[If you have relevant logs, paste them here. Otherwise, say "Please analyze the `discordllmbot.log` file to diagnose the root cause."]

**5. Workflow Step:**
This is a bug fix. Please update the current session file to document the issue and the fix. Once done, prepare the commit.
````

---

### Template: Documentation or Refactoring Request

````markdown
**1. My Goal:**
I want to [refactor the `shared/storage/persistence.js` module to improve readability / update the documentation for the API].

**2. Specific Changes:**
- [List the specific changes you want to make. For example: "- Rename the `saveRelationships` function to `persistGuildRelationships` for clarity.
- Add JSDoc comments to all exported functions."]

**3. Critical Rules to Follow:**
[Remind me of any critical rules from `.clinerules` that are especially relevant to this task. For example: "Remember to follow the verb-first function naming convention."]

**4. Workflow Step:**
Please update the session file to log this refactoring task and prepare the commit once complete.
````
