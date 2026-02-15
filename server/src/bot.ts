import { env } from './config/env';

const API = `https://api.telegram.org/bot${env.botToken}`;

async function callApi(method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
}

async function handleUpdate(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;

  if (msg.text.startsWith('/start')) {
    const param = msg.text.split(' ')[1]; // e.g. "invite_abc123"

    if (param?.startsWith('invite_')) {
      // Invite link — open app with startapp parameter
      await callApi('sendMessage', {
        chat_id: chatId,
        text: `${msg.from?.first_name ?? 'Hey'}, you've been invited to become wishlist partners!`,
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Accept invitation',
              web_app: { url: `${env.clientUrl}?invite=${param.replace('invite_', '')}` },
            },
          ]],
        },
      });
    } else {
      // Regular /start — open app
      await callApi('sendMessage', {
        chat_id: chatId,
        text: 'Welcome to Wishlist! Open the app to manage your wishes.',
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Open Wishlist',
              web_app: { url: env.clientUrl },
            },
          ]],
        },
      });
    }
  }
}

export async function startBot() {
  // Delete any existing webhook so polling works
  await callApi('deleteWebhook');

  let offset = 0;
  console.log('Bot polling started');

  async function poll() {
    try {
      const data = await callApi('getUpdates', { offset, timeout: 30 }) as { result?: TelegramUpdate[] };
      if (data.result?.length) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          handleUpdate(update).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
    // Continue polling
    setTimeout(poll, 100);
  }

  poll();
}
