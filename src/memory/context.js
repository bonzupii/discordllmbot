import { saveContext, loadContexts } from '../storage/persistence.js'

const memory = loadContexts()
const MAX_MESSAGES = 12

export function addMessage(channelId, author, content) {
    memory[channelId] ??= []

    memory[channelId].push({
        author,
        content
    })

    if (memory[channelId].length > MAX_MESSAGES) {
        memory[channelId].shift()
    }

    // Persist this channel's context
    saveContext(channelId, memory[channelId])
}

export function getContext(channelId) {
    return memory[channelId] ?? []
}
