declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        ready: () => void;
        expand: () => void;
        close: () => void;
        platform: string;
        colorScheme: string;
        themeParams: Record<string, string>;
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

function getWebApp() {
  return window.Telegram?.WebApp;
}

export function initTelegramApp() {
  const webApp = getWebApp();
  if (webApp) {
    webApp.ready();
    webApp.expand();
    console.log('Telegram WebApp initialized, platform:', webApp.platform);
    console.log('initData length:', webApp.initData?.length);
  } else {
    console.warn('Telegram WebApp not available — running in dev mode');
  }
}

export function getInitDataRaw(): string | undefined {
  const data = getWebApp()?.initData;
  return data || undefined;
}

export function getStartParam(): string | undefined {
  const initDataUnsafe = getWebApp()?.initDataUnsafe as { start_param?: string } | undefined;
  return initDataUnsafe?.start_param;
}
