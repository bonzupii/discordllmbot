import { connect, setupSchema } from './database.js';

let db;

async function getDb() {
    if (!db) {
        db = await connect();
        await setupSchema();
    }
    return db;
}

export async function loadRelationships(guildId) {
    const db = await getDb();
    const rels = {};

    const relRes = await db.query('SELECT * FROM relationships WHERE guildId = $1', [guildId]);

    for (const row of relRes.rows) {
        const behaviorRes = await db.query('SELECT behavior FROM relationship_behaviors WHERE guildId = $1 AND userId = $2', [guildId, row.userId]);
        const boundaryRes = await db.query('SELECT boundary FROM relationship_boundaries WHERE guildId = $1 AND userId = $2', [guildId, row.userId]);

        rels[row.userId] = {
            attitude: row.attitude,
            behavior: behaviorRes.rows.map(r => r.behavior),
            boundaries: boundaryRes.rows.map(r => r.boundary),
        };
    }
    return rels;
}

export async function saveRelationships(guildId, relationships) {
    const db = await getDb();
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM relationship_behaviors WHERE guildId = $1', [guildId]);
        await client.query('DELETE FROM relationship_boundaries WHERE guildId = $1', [guildId]);
        await client.query('DELETE FROM relationships WHERE guildId = $1', [guildId]);

        for (const userId in relationships) {
            const rel = relationships[userId];
            await client.query('INSERT INTO relationships (guildId, userId, attitude) VALUES ($1, $2, $3)', [guildId, userId, rel.attitude]);
            for (const b of rel.behavior) {
                await client.query('INSERT INTO relationship_behaviors (guildId, userId, behavior) VALUES ($1, $2, $3)', [guildId, userId, b]);
            }
            for (const b of rel.boundaries) {
                await client.query('INSERT INTO relationship_boundaries (guildId, userId, boundary) VALUES ($1, $2, $3)', [guildId, userId, b]);
            }
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function loadContexts(guildId, channelId, maxMessages) {
    const db = await getDb();
    const res = await db.query(
        'SELECT authorId, authorName, content FROM messages WHERE guildId = $1 AND channelId = $2 ORDER BY timestamp DESC LIMIT $3',
        [guildId, channelId, maxMessages]
    );
    return res.rows.reverse().map(row => ({ authorId: row.authorid, author: row.authorname, content: row.content }));
}

export async function saveMessage(guildId, channelId, authorId, authorName, content) {
    const db = await getDb();
    await db.query(
        'INSERT INTO messages (guildId, channelId, authorId, authorName, content) VALUES ($1, $2, $3, $4, $5)',
        [guildId, channelId, authorId, authorName, content]
    );
}

export async function pruneOldMessages(maxAgeDays) {
    const db = await getDb();
    const res = await db.query("DELETE FROM messages WHERE timestamp < NOW() - ($1 * INTERVAL '1 day')", [maxAgeDays]);
    if (res.rowCount > 0) {
        logger.info(`Pruned ${res.rowCount} old messages from the database.`);
    }
}
