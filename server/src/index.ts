import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import pairRoutes from './routes/pairs';
import wishRoutes from './routes/wishes';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import calendarRoutes from './routes/calendar';
import giftIdeaRoutes from './routes/giftIdeas';
import notesRoutes from './routes/notes';
import { setupYjsPersistence, wsUtils, trackEditor, untrackEditor } from './services/yjsPersistence';
import { Note } from './models/Note';
import { userCanAccessNote } from './services/noteAccess';

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(morgan('short'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api', limiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/pairs', pairRoutes);
app.use('/api/wishes', wishRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/gift-ideas', giftIdeaRoutes);
app.use('/api/notes', notesRoutes);

app.use(errorHandler);

import { startBot } from './bot';

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

setupYjsPersistence();

server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    if (!url.pathname.startsWith('/yws/')) {
      socket.destroy();
      return;
    }
    const noteId = url.pathname.slice('/yws/'.length).split('/')[0];
    const token = url.searchParams.get('token');
    if (!noteId || !token) {
      socket.destroy();
      return;
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as { userId: string };
      userId = decoded.userId;
    } catch {
      socket.destroy();
      return;
    }

    const note = await Note.findById(noteId);
    if (!note || note.type !== 'doc') {
      socket.destroy();
      return;
    }
    const allowed = await userCanAccessNote(userId, note);
    if (!allowed) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      trackEditor(noteId, userId);
      wsUtils.setupWSConnection(ws, req, { docName: noteId, gc: true });
      ws.on('close', () => {
        untrackEditor(noteId, userId);
      });
    });
  } catch (err) {
    console.error('WS upgrade error:', err);
    socket.destroy();
  }
});

async function start() {
  await connectDB();
  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
  startBot();
}

start();
