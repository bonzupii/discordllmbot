import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '../shared/utils/logger.js';
import { loadConfig } from '../shared/config/configLoader.js';
import { connect } from '../shared/storage/database.js';

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

// Start server
async function start() {
  try {
    await connect(); // Connect to DB
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
