import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface ParsedInitData {
  user?: TelegramUser;
  query_id?: string;
  auth_date: number;
  hash: string;
  [key: string]: unknown;
}

export function validateInitData(initDataRaw: string, botToken: string): ParsedInitData {
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get('hash');
  if (!hash) {
    throw new Error('Missing hash in initData');
  }

  params.delete('hash');
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) {
    throw new Error('Invalid initData signature');
  }

  const authDate = parseInt(params.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    throw new Error('initData expired');
  }

  const result: ParsedInitData = { auth_date: authDate, hash };
  const userStr = params.get('user');
  if (userStr) {
    result.user = JSON.parse(userStr);
  }
  const queryId = params.get('query_id');
  if (queryId) {
    result.query_id = queryId;
  }

  return result;
}
