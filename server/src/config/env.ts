import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongodbUri: requireEnv('MONGODB_URI'),
  botToken: requireEnv('BOT_TOKEN'),
  jwtSecret: requireEnv('JWT_SECRET'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
