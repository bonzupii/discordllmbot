/**
 * Knowledge Ingestion Module
 * Processes documents and RSS feeds into the hypergraph
 * @module bot/src/core/knowledgeIngestion
 */

import Parser from 'rss-parser';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { createHyperedge, findOrCreateNode } from '../../../shared/storage/hypergraphPersistence.js';
import { 
    getRssFeeds, 
    updateRssLastFetched, 
    updateDocumentStatus 
} from '../../../shared/storage/knowledgePersistence.js';
import { generateReply } from '../llm/index.js';
import { logger } from '../../../shared/utils/logger.js';

const rssParser = new Parser();

/**
 * Uses LLM to extract structured knowledge for ingestion
 */
async function extractKnowledge(text: string): Promise<{ summary: string, entities: any[] }> {
    if (!text || text.length < 10) return { summary: 'No content', entities: [] };
    
    try {
        const prompt = `Analyze the following text and extract key knowledge for a hypergraph database.
        Return a JSON object with:
        1. "summary": A concise 1-sentence summary of the main fact.
        2. "entities": An array of objects with "name" and "type" (one of: topic, concept, event, user, channel).
        
        TEXT:
        ${text.substring(0, 3000)}
        
        RESPONSE (JSON ONLY):`;
        
        const response = await generateReply(prompt);
        
        // Clean the response to ensure it's valid JSON
        const jsonStr = response.reply.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonStr);
        
        return {
            summary: data.summary || 'Summary unavailable',
            entities: (data.entities || []).map((e: any) => ({
                id: e.name.toLowerCase().replace(/\s+/g, '-'),
                name: e.name,
                type: e.type || 'topic'
            }))
        };
    } catch (error) {
        logger.warn('Failed to extract structured knowledge via LLM', error);
        return { summary: text.substring(0, 100) + '...', entities: [] };
    }
}

/**
 * Process an RSS feed and ingest new items
 */
export async function processRssFeed(guildId: string, feedId: number, url: string) {
    try {
        const feed = await rssParser.parseURL(url);
        logger.info(`Processing RSS feed: ${feed.title} (${url})`);

        for (const item of feed.items.slice(0, 5)) {
            const { summary, entities } = await extractKnowledge(item.contentSnippet || item.content || item.title || '');
            
            await createHyperedge(guildId, {
                channelId: 'system-ingestion',
                edgeType: 'fact',
                summary: `RSS: ${item.title} - ${summary}`,
                content: item.link + '\n\n' + (item.contentSnippet || ''),
                importance: 0.6,
                memberships: entities.map(entity => ({
                    entity,
                    role: 'topic',
                    weight: 0.8
                })),
                metadata: { source: 'rss', url: item.link }
            });
        }

        await updateRssLastFetched(feedId);
    } catch (error) {
        logger.error(`Failed to process RSS feed ${url}`, error);
    }
}

/**
 * Process a document (PDF, Text, Markdown)
 */
export async function processDocument(guildId: string, docId: number, buffer: Buffer, filename: string) {
    try {
        await updateDocumentStatus(docId, { status: 'processing' });
        
        let text = '';
        const ext = filename.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
            const data = await pdf(buffer);
            text = data.text;
        } else if (ext === 'txt' || ext === 'md') {
            text = buffer.toString('utf-8');
        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }
        
        logger.info(`Processing document: ${filename} (${text.length} chars)`);

        const { summary, entities } = await extractKnowledge(text.substring(0, 5000));
        
        await createHyperedge(guildId, {
            channelId: 'system-ingestion',
            edgeType: 'fact',
            summary: `Document: ${filename} - ${summary}`,
            content: text.substring(0, 1000), // Store first 1k chars as content
            importance: 0.8,
            memberships: entities.map(entity => ({
                entity,
                role: 'subject',
                weight: 0.9
            })),
            metadata: { source: 'upload', filename }
        });

        await updateDocumentStatus(docId, { status: 'completed', processedAt: true });
    } catch (error) {
        logger.error(`Failed to process document ${filename}`, error);
        await updateDocumentStatus(docId, { status: 'error', errorMessage: (error as Error).message });
    }
}

/**
 * Background task to check all enabled RSS feeds
 */
export async function startRssInformer(guildId: string) {
    const feeds = await getRssFeeds(guildId);
    const enabledFeeds = feeds.filter(f => f.enabled);
    
    for (const feed of enabledFeeds) {
        // Simple check: if never fetched or interval passed
        const lastFetched = feed.lastFetchedAt ? new Date(feed.lastFetchedAt).getTime() : 0;
        const now = Date.now();
        const intervalMs = (feed.intervalMinutes || 60) * 60 * 1000;
        
        if (now - lastFetched >= intervalMs) {
            await processRssFeed(guildId, feed.id, feed.url);
        }
    }
}
