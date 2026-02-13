import { init, retrieveLaunchParams, miniApp, themeParams, backButton } from '@telegram-apps/sdk-react';

export function initTelegramApp() {
  try {
    init();
    miniApp.mount();
    themeParams.mount();
    backButton.mount();
    miniApp.ready();
  } catch {
    // Running outside Telegram (development)
    console.warn('Telegram SDK init failed — running in dev mode');
  }
}

export function getInitDataRaw(): string | undefined {
  try {
    const { initDataRaw } = retrieveLaunchParams();
    return initDataRaw;
  } catch {
    return undefined;
  }
}

export function getStartParam(): string | undefined {
  try {
    const { startParam } = retrieveLaunchParams();
    return startParam;
  } catch {
    return undefined;
  }
}
