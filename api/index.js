import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '../shared/utils/logger.js';
import { loadConfig } from '../shared/config/configLoader.js';
import { connect, setupSchema } from '../shared/storage/database.js';
import { loadRelationships, saveRelationships } from '../shared/storage/persistence.js';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOT_CONFIG_PATH = path.join(process.cwd(), 'shared', 'config', 'bot.json');
const LOG_FILE_PATH = path.join(process.cwd(), '..', 'discordllmbot.log');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for now (dev)
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.API_PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  try {
    const config = loadConfig();
    res.json(config);
  } catch (err) {
    logger.error('Failed to load config', err);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    // Basic validation: ensure it's an object
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ error: 'Invalid config format' });
    }

    fs.writeFileSync(BOT_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    logger.info('Config updated via API');
    res.json({ message: 'Config updated successfully' });
  } catch (err) {
    logger.error('Failed to update config', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Relationships endpoints
app.get('/api/guilds', async (req, res) => {
  try {
    const db = await connect();
    const result = await db.query('SELECT guildId, guildName FROM guilds');
    res.json(result.rows.map(r => ({ id: r.guildid, name: r.guildname })));
  } catch (err) {
    logger.error('Failed to load guilds', err);
    res.status(500).json({ error: 'Failed to load guilds' });
  }
});

app.get('/api/guilds/:guildId/relationships', async (req, res) => {
  try {
    const { guildId } = req.params;
    const relationships = await loadRelationships(guildId);
    res.json(relationships);
  } catch (err) {
    logger.error('Failed to load relationships', err);
    res.status(500).json({ error: 'Failed to load relationships' });
  }
});

app.post('/api/guilds/:guildId/relationships/:userId', async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const newRel = req.body;

    // Load current relationships for the guild
    const currentRels = await loadRelationships(guildId);

    // Update the specific user's relationship
    currentRels[userId] = newRel;

    
    // Update the specific user's relationship
    currentRels[userId] = newRel;

    // Save back to DB
    await saveRelationships(guildId, currentRels);

    // Notify bot to reload
    try {
      await axios.post('http://bot:3001/reload', { guildId });
      logger.info(`Sent reload request to bot for guild ${guildId}`);
    } catch (reloadErr) {
      logger.error(`Failed to send reload request to bot for guild ${guildId}`, reloadErr);
    }

    res.json({ message: 'Relationship updated successfully' });
  } catch (err) {
    logger.error('Failed to update relationship', err);
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  logger.info('Dashboard client connected');
  
  // Send last 50 lines of logs on connection
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const logs = fs.readFileSync(LOG_FILE_PATH, 'utf-8').split('\n').slice(-50);
      socket.emit('logs:init', logs);
    }
  } catch (err) {
    logger.error('Failed to read log file for init', err);
  }

  socket.on('disconnect', () => {
    logger.info('Dashboard client disconnected');
  });
});

// Watch log file for changes
if (fs.existsSync(LOG_FILE_PATH)) {
  let fileSize = fs.statSync(LOG_FILE_PATH).size;
  fs.watch(LOG_FILE_PATH, (event) => {
    if (event === 'change') {
      const stats = fs.statSync(LOG_FILE_PATH);
      if (stats.size > fileSize) {
        const stream = fs.createReadStream(LOG_FILE_PATH, {
          start: fileSize,
          end: stats.size
        });
        stream.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(l => l.trim());
          lines.forEach(line => io.emit('log', line));
        });
        fileSize = stats.size;
      } else if (stats.size < fileSize) {
        // File was truncated
        fileSize = stats.size;
      }
    }
  });
}

// Start server
async function start() {
  try {
    await connect(); // Connect to DB
    await setupSchema(); // Ensure schema is set up
    logger.info('API connected to database');

    httpServer.listen(PORT, () => {
      logger.info(`API server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start API server', err);
    process.exit(1);
  }
}

start();
