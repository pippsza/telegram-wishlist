import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import pairRoutes from './routes/pairs';
import wishRoutes from './routes/wishes';
import userRoutes from './routes/users';

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/pairs', pairRoutes);
app.use('/api/wishes', wishRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

import { startBot } from './bot';

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
  startBot();
}

start();
