/**
 * Hypergraph Persistence Layer
 *
 * CRUD operations for the hypergraph memory system.
 * Handles nodes (entities), hyperedges (memories), and memberships.
 *
 * @module shared/storage/hypergraphPersistence
 */

import { getDb } from './persistence.js';
import { logger } from '../utils/logger.js';

// ==================== Node Operations ====================

/**
 * Find or create a node in the hypergraph
 * @param {string} guildId - Guild ID
 * @param {string} nodeId - Unique identifier within guild
 * @param {string} nodeType - Type of node ('user', 'channel', 'topic', 'emotion', 'event', 'concept')
 * @param {string} name - Display name
 * @param {object} metadata - Additional data
 * @returns {Promise<number>} Node ID
 */
export async function findOrCreateNode(guildId, nodeId, nodeType, name, metadata = {}) {
    const db = await getDb();

    const result = await db.query(
        `INSERT INTO hyper_nodes (guildId, nodeId, nodeType, name, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (guildId, nodeId, nodeType)
         DO UPDATE SET
             name = EXCLUDED.name,
             metadata = CASE WHEN EXCLUDED.metadata::text = '{}' THEN hyper_nodes.metadata ELSE EXCLUDED.metadata END,
             updatedAt = CURRENT_TIMESTAMP
         RETURNING id`,
        [guildId, nodeId, nodeType, name, JSON.stringify(metadata)]
    );

    return result.rows[0].id;
}

/**
 * Get nodes by type for a guild
 * @param {string} guildId - Guild ID
 * @param {string} nodeType - Node type filter
 * @returns {Promise<Array>} Nodes
 */
export async function getNodesByType(guildId, nodeType) {
    const db = await getDb();
    const result = await db.query(
        `SELECT * FROM hyper_nodes WHERE guildId = $1 AND nodeType = $2 ORDER BY createdAt DESC`,
        [guildId, nodeType]
    );
    return result.rows;
}

/**
 * Get all nodes for a guild
 * @param {string} guildId - Guild ID
 * @returns {Promise<Array>} Nodes
 */
export async function getAllNodes(guildId) {
    const db = await getDb();
    const result = await db.query(
        `SELECT * FROM hyper_nodes WHERE guildId = $1 ORDER BY nodeType, createdAt DESC`,
        [guildId]
    );
    return result.rows;
}

/**
 * Find a node by guild, node ID, and type
 * @param {string} guildId - Guild ID
 * @param {string} nodeId - Node ID
 * @param {string} nodeType - Node type
 * @returns {Promise<object|null>} Node or null
 */
export async function findNode(guildId, nodeId, nodeType) {
    const db = await getDb();
    const result = await db.query(
        `SELECT * FROM hyper_nodes WHERE guildId = $1 AND nodeId = $2 AND nodeType = $3`,
        [guildId, nodeId, nodeType]
    );
    return result.rows[0] || null;
}

// ==================== Hyperedge Operations ====================

/**
 * Create a new hyperedge (memory) with its memberships
 * @param {string} guildId - Guild ID
 * @param {object} edgeData - Edge data
 * @returns {Promise<number>} Hyperedge ID
 */
export async function createHyperedge(guildId, edgeData) {
    const db = await getDb();
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Create the hyperedge
        const edgeResult = await client.query(
            `INSERT INTO hyperedges (guildId, channelId, edgeType, summary, content, importance, urgency,
                sourceMessageId, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [guildId, edgeData.channelId, edgeData.edgeType, edgeData.summary,
             edgeData.content || null, edgeData.importance || 1.0, edgeData.importance || 1.0,
             edgeData.sourceMessageId || null, JSON.stringify(edgeData.metadata || {})]
        );

        const edgeId = edgeResult.rows[0].id;

        // Create memberships
        for (const membership of edgeData.memberships || []) {
            const nodeId = await findOrCreateNode(
                guildId,
                membership.entity.id,
                membership.entity.type,
                membership.entity.name,
                membership.entity.metadata || {}
            );

            await client.query(
                `INSERT INTO hyperedge_memberships (hyperedgeId, nodeId, role, weight, metadata)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (hyperedgeId, nodeId, role) DO NOTHING`,
                [edgeId, nodeId, membership.role, membership.weight || 1.0,
                 JSON.stringify(membership.metadata || {})]
            );
        }

        await client.query('COMMIT');
        logger.info(`Created hyperedge ${edgeId}: ${edgeData.summary}`);
        return edgeId;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Failed to create hyperedge', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Query hyperedges by node with urgency threshold
 * @param {string} guildId - Guild ID
 * @param {string} nodeId - Node ID to search for
 * @param {number} minUrgency - Minimum urgency score
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Hyperedges with members
 */
export async function queryMemoriesByNode(guildId, nodeId, minUrgency = 0.1, limit = 20) {
    const db = await getDb();
    const result = await db.query(
        `SELECT e.*,
                json_agg(json_build_object(
                    'nodeid', hem.id,
                    'nodetype', hem.nodeType,
                    'name', hem.name,
                    'role', hem.role,
                    'weight', hem.weight
                ) ORDER BY hem.weight DESC) as members
         FROM hyperedges e
         JOIN LATERAL (
             SELECT hem.hyperedgeId, hem.nodeId, hem.role, hem.weight, n.id, n.nodeType, n.name
             FROM hyperedge_memberships hem
             JOIN hyper_nodes n ON hem.nodeId = n.id
             WHERE hem.hyperedgeId = e.id
             ORDER BY hem.weight DESC
         ) AS hem ON true
         WHERE e.guildId = $1
           AND n.nodeId = $2
           AND e.urgency >= $3
         GROUP BY e.id, e.guildId, e.channelId, e.edgeType, e.summary, e.content, e.importance,
                  e.urgency, e.accessCount, e.lastAccessedAt, e.sourceMessageId, e.extractedAt,
                  e.metadata, e.createdAt, e.updatedAt
         ORDER BY e.urgency DESC
         LIMIT $4`,
        [guildId, nodeId, minUrgency, limit]
    );
    return result.rows;
}

/**
 * Get contextual memories for LLM prompt generation
 * Enforces channel isolation but allows all relevant channel memories
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID to prioritize (optional)
 * @param {number} limit - Max memories to return
 * @returns {Promise<Array>} Relevant memories
 */
export async function getContextualMemories(guildId, channelId, userId, limit = 10) {
    const db = await getDb();
    
    // We want memories from this channel. 
    // We prioritize memories involving the current user, but include others too.
    const result = await db.query(
        `SELECT e.*,
                json_agg(json_build_object(
                    'nodetype', hem.nodeType,
                    'name', hem.name,
                    'role', hem.role
                ) ORDER BY hem.weight DESC) as members,
                EXISTS (
                    SELECT 1 FROM hyperedge_memberships hem2
                    JOIN hyper_nodes n2 ON hem2.nodeId = n2.id
                    WHERE hem2.hyperedgeId = e.id AND n2.nodeId = $3
                ) as involves_user
         FROM hyperedges e
         JOIN LATERAL (
             SELECT hem.hyperedgeId, hem.nodeId, hem.role, hem.weight, n.nodeType, n.name
             FROM hyperedge_memberships hem
             JOIN hyper_nodes n ON hem.nodeId = n.id
             WHERE hem.hyperedgeId = e.id
             ORDER BY hem.weight DESC
         ) AS hem ON true
         WHERE e.guildId = $1
           AND e.channelId = $2
           AND e.urgency > 0.1
         GROUP BY e.id, e.guildId, e.channelId, e.edgeType, e.summary, e.content, e.importance,
                  e.urgency, e.accessCount, e.lastAccessedAt, e.sourceMessageId, e.extractedAt,
                  e.metadata, e.createdAt, e.updatedAt
         ORDER BY involves_user DESC, e.urgency DESC
         LIMIT $4`,
        [guildId, channelId, userId, limit]
    );
    return result.rows;
}

/**
 * Get user facts that can be shared across channels (edgeType = 'fact')
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {number} limit - Max facts to return
 * @returns {Promise<Array>} User facts
 */
export async function getUserFacts(guildId, userId, limit = 10) {
    const db = await getDb();
    const result = await db.query(
        `SELECT e.*
         FROM hyperedges e
         WHERE e.guildId = $1
           AND e.edgeType = 'fact'
           AND e.urgency > 0.1
           AND EXISTS (
               SELECT 1 FROM hyperedge_memberships hem
               JOIN hyper_nodes n ON hem.nodeId = n.id
               WHERE hem.hyperedgeId = e.id AND n.nodeId = $2
           )
         ORDER BY e.urgency DESC
         LIMIT $3`,
        [guildId, userId, limit]
    );
    return result.rows;
}

/**
 * Get global knowledge facts (not tied to specific users)
 * @param {string} guildId - Guild ID
 * @param {number} limit - Max facts to return
 * @returns {Promise<Array>} Global facts
 */
export async function getGlobalKnowledge(guildId, limit = 10) {
    const db = await getDb();
    const result = await db.query(
        `SELECT e.*,
                json_agg(json_build_object(
                    'nodetype', n.nodeType,
                    'name', n.name,
                    'role', hem.role
                ) ORDER BY hem.weight DESC) as members
         FROM hyperedges e
         LEFT JOIN hyperedge_memberships hem ON e.id = hem.hyperedgeId
         LEFT JOIN hyper_nodes n ON hem.nodeId = n.id
         WHERE e.guildId = $1
           AND e.edgeType = 'fact'
           AND e.urgency > 0.1
           AND e.channelId = 'system-ingestion'
         GROUP BY e.id
         ORDER BY e.urgency DESC
         LIMIT $2`,
        [guildId, limit]
    );
    return result.rows;
}

/**
 * Get graph data for visualization
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID (optional, for filtering)
 * @param {number} limit - Max results
 * @returns {Promise<object>} Graph data with nodes and edges
 */
export async function getGraphData(guildId, channelId = null, limit = 100) {
    const db = await getDb();

    const channelFilter = channelId ? `WHERE e.guildId = $1 AND e.channelId = $2` : `WHERE e.guildId = $1`;
    const params = channelId ? [guildId, channelId, limit] : [guildId, limit];

    // Get edges with memberships
    const edgesResult = await db.query(
        `SELECT e.id, e.edgeType, e.summary, e.urgency, e.channelId,
                json_agg(json_build_object(
                    'nodeid', hem.id,
                    'nodetype', hem.nodeType,
                    'name', hem.name,
                    'role', hem.role,
                    'weight', hem.weight
                )) as connections
         FROM hyperedges e
         JOIN LATERAL (
             SELECT hem.hyperedgeId, hem.nodeId, hem.role, hem.weight, n.id, n.nodeType, n.name
             FROM hyperedge_memberships hem
             JOIN hyper_nodes n ON hem.nodeId = n.id
             WHERE hem.hyperedgeId = e.id
         ) AS hem ON true
         ${channelFilter}
         GROUP BY e.id, e.edgeType, e.summary, e.urgency, e.channelId
         ORDER BY e.urgency DESC
         LIMIT $${params.length}`,
        params
    );

    // Get unique node IDs from edges
    const nodeIds = new Set();
    edgesResult.rows.forEach(edge => {
        if (edge.connections) {
            edge.connections.forEach(conn => {
                if (conn.nodeid) nodeIds.add(conn.nodeid);
            });
        }
    });

    // Get node details
    let nodes = [];
    if (nodeIds.size > 0) {
        const nodesResult = await db.query(
            `SELECT id, nodeId, nodeType, name, metadata
             FROM hyper_nodes
             WHERE id = ANY($1::int[])
             ORDER BY nodeType, name`,
            [Array.from(nodeIds)]
        );
        nodes = nodesResult.rows;
    }

    return { nodes, edges: edgesResult.rows };
}

// ==================== Decay Operations ====================

/**
 * Update urgency scores for all memories in a guild
 * Uses exponential decay: urgency = importance * exp(-decayRate * daysSinceCreation) + (accessCount * boost)
 * @param {string} guildId - Guild ID
 * @param {number} decayRate - Daily decay rate
 * @param {number} accessBoost - Boost per access
 * @returns {Promise<Array>} Updated hyperedges
 */
export async function updateMemoryUrgency(guildId, decayRate = 0.1, accessBoost = 0.05) {
    const db = await getDb();
    const result = await db.query(
        `UPDATE hyperedges
         SET urgency = LEAST(importance * EXP(((0.0 - $1::float) * EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - createdAt))) / 86400.0) + (accessCount * $2::float), 10.0),
             updatedAt = CURRENT_TIMESTAMP
         WHERE guildId = $3
         RETURNING id, urgency, importance`,
        [decayRate, accessBoost, guildId]
    );
    return result.rows;
}

/**
 * Prune low-urgency memories older than threshold
 * @param {string} guildId - Guild ID
 * @param {number} minUrgency - Minimum urgency threshold
 * @param {number} minAgeDays - Minimum age in days before pruning
 * @returns {Promise<number>} Number of pruned memories
 */
export async function pruneLowUrgencyMemories(guildId, minUrgency = 0.1, minAgeDays = 7) {
    const db = await getDb();
    const result = await db.query(
        `DELETE FROM hyperedges
         WHERE guildId = $1
           AND urgency < $2
           AND createdAt < NOW() - INTERVAL '1 day' * $3
         RETURNING id`,
        [guildId, minUrgency, minAgeDays]
    );
    logger.info(`Pruned ${result.rowCount} memories from guild ${guildId}`);
    return result.rowCount;
}

/**
 * Record memory access and boost its importance
 * @param {number} hyperedgeId - Hyperedge ID
 * @returns {Promise<void>}
 */
export async function recordMemoryAccess(hyperedgeId) {
    const db = await getDb();
    await db.query(
        `UPDATE hyperedges
         SET accessCount = accessCount + 1,
             lastAccessedAt = CURRENT_TIMESTAMP,
             urgency = LEAST(urgency * 1.1, 10.0),
             updatedAt = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [hyperedgeId]
    );
}

// ==================== Analytics ====================

/**
 * Get hypergraph statistics for dashboard
 * @param {string} guildId - Guild ID
 * @returns {Promise<object>} Statistics
 */
export async function getHypergraphStats(guildId) {
    const db = await getDb();

    const [nodeStats, edgeStats, topEntities] = await Promise.all([
        db.query(
            `SELECT nodeType, COUNT(*) as count FROM hyper_nodes WHERE guildId = $1 GROUP BY nodeType ORDER BY count DESC`,
            [guildId]
        ),
        db.query(
            `SELECT edgeType, COUNT(*) as count, AVG(urgency) as avgUrgency
             FROM hyperedges WHERE guildId = $1 GROUP BY edgeType ORDER BY count DESC`,
            [guildId]
        ),
        db.query(
            `SELECT n.nodeType, n.name, COUNT(DISTINCT hem.hyperedgeId) as memoryCount
             FROM hyper_nodes n
             JOIN hyperedge_memberships hem ON n.id = hem.nodeId
             JOIN hyperedges e ON hem.hyperedgeId = e.id
             WHERE n.guildId = $1
             GROUP BY n.nodeType, n.name, n.id
             ORDER BY memoryCount DESC
             LIMIT 20`,
            [guildId]
        )
    ]);

    // Get total memory count by channel
    const channelStats = await db.query(
        `SELECT channelId, COUNT(*) as count FROM hyperedges WHERE guildId = $1 GROUP BY channelId ORDER BY count DESC LIMIT 10`,
        [guildId]
    );

    return {
        nodesByType: nodeStats.rows,
        edgesByType: edgeStats.rows,
        topEntities: topEntities.rows,
        channels: channelStats.rows,
        totalNodes: nodeStats.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
        totalEdges: edgeStats.rows.reduce((sum, r) => sum + parseInt(r.count), 0)
    };
}

/**
 * Get memories for a specific channel (for dashboard)
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @param {number} minUrgency - Minimum urgency
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Memories
 */
export async function getChannelMemories(guildId, channelId, minUrgency = 0, limit = 50) {
    const db = await getDb();
    const result = await db.query(
        `SELECT e.*,
                json_agg(json_build_object(
                    'nodetype', hem.nodeType,
                    'name', hem.name,
                    'role', hem.role
                ) ORDER BY hem.weight DESC) as members
         FROM hyperedges e
         JOIN LATERAL (
             SELECT hem.hyperedgeId, hem.nodeId, hem.role, hem.weight, n.nodeType, n.name
             FROM hyperedge_memberships hem
             JOIN hyper_nodes n ON hem.nodeId = n.id
             WHERE hem.hyperedgeId = e.id
             ORDER BY hem.weight DESC
         ) AS hem ON true
         WHERE e.guildId = $1 AND e.channelId = $2
           AND e.urgency >= $3
         GROUP BY e.id, e.guildId, e.channelId, e.edgeType, e.summary, e.content, e.importance,
                  e.urgency, e.accessCount, e.lastAccessedAt, e.sourceMessageId, e.extractedAt,
                  e.metadata, e.createdAt, e.updatedAt
         ORDER BY e.urgency DESC
         LIMIT $4`,
        [guildId, channelId, minUrgency, limit]
    );
    return result.rows;
}

// ==================== Config Operations ====================

/**
 * Get hypergraph config for a guild
 * @param {string} guildId - Guild ID
 * @returns {Promise<object>} Config
 */
export async function getHypergraphConfig(guildId) {
    const db = await getDb();
    const result = await db.query(
        `SELECT * FROM hypergraph_config WHERE guildId = $1`,
        [guildId]
    );

    if (result.rows.length === 0) {
        // Return default config
        return {
            guildId,
            extractionEnabled: true,
            decayRate: 0.1,
            importanceBoostOnAccess: 0.05,
            minUrgencyThreshold: 0.1,
            maxMemoriesPerNode: 100
        };
    }

    return result.rows[0];
}

/**
 * Update hypergraph config for a guild
 * @param {string} guildId - Guild ID
 * @param {object} config - Config values
 * @returns {Promise<void>}
 */
export async function updateHypergraphConfig(guildId, config) {
    const db = await getDb();
    await db.query(
        `INSERT INTO hypergraph_config (guildId, extractionEnabled, decayRate,
            importanceBoostOnAccess, minUrgencyThreshold, maxMemoriesPerNode)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (guildId)
         DO UPDATE SET
            extractionEnabled = EXCLUDED.extractionEnabled,
            decayRate = EXCLUDED.decayRate,
            importanceBoostOnAccess = EXCLUDED.importanceBoostOnAccess,
            minUrgencyThreshold = EXCLUDED.minUrgencyThreshold,
            maxMemoriesPerNode = EXCLUDED.maxMemoriesPerNode,
            updatedAt = CURRENT_TIMESTAMP`,
        [guildId,
         config.extractionEnabled !== undefined ? config.extractionEnabled : true,
         config.decayRate !== undefined ? config.decayRate : 0.1,
         config.importanceBoostOnAccess !== undefined ? config.importanceBoostOnAccess : 0.05,
         config.minUrgencyThreshold !== undefined ? config.minUrgencyThreshold : 0.1,
         config.maxMemoriesPerNode !== undefined ? config.maxMemoriesPerNode : 100]
    );
}
