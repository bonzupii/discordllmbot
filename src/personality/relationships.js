import { loadRelationships, saveRelationships } from '../storage/persistence.js'

const relationships = loadRelationships()

export function getRelationship(guildId, userId) {
    return relationships[guildId]?.[userId] ?? {
        attitude: 'neutral',
        behavior: [
            'treat them like a normal server regular'
        ],
        boundaries: []
    }
}

export function setRelationship(guildId, userId, config) {
    relationships[guildId] ??= {}
    relationships[guildId][userId] = config
    
    // Persist relationships immediately
    saveRelationships(relationships)
}
