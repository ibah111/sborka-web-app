export interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  cookieEnabled: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  window: {
    innerWidth: number;
    innerHeight: number;
    devicePixelRatio: number;
  };
  timezone: string;
  time: { iso: string; local: string };
  location: {
    href: string;
    origin: string;
    pathname: string;
    search: string;
    hash: string;
  };
  referrer: string;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  touchSupport: boolean;
  online: boolean;
}

const nav = typeof navigator !== "undefined" ? navigator : null;
const win = typeof window !== "undefined" ? window : null;

export function collectBrowserInfo(): BrowserInfo | null {
  if (!nav || !win) return null;

  const now = new Date();
  const opts = Intl.DateTimeFormat().resolvedOptions();
  const conn = (
    nav as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    }
  ).connection;

  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    languages: [...nav.languages],
    cookieEnabled: nav.cookieEnabled,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: (nav as Navigator & { deviceMemory?: number }).deviceMemory,
    screen: {
      width: win.screen.width,
      height: win.screen.height,
      availWidth: win.screen.availWidth,
      availHeight: win.screen.availHeight,
      colorDepth: win.screen.colorDepth,
      pixelDepth: win.screen.pixelDepth,
    },
    window: {
      innerWidth: win.innerWidth,
      innerHeight: win.innerHeight,
      devicePixelRatio: win.devicePixelRatio,
    },
    timezone: opts.timeZone,
    time: { iso: now.toISOString(), local: now.toLocaleString() },
    location: {
      href: win.location.href,
      origin: win.location.origin,
      pathname: win.location.pathname,
      search: win.location.search,
      hash: win.location.hash,
    },
    referrer: win.document.referrer,
    connection: conn
      ? {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
        }
      : undefined,
    touchSupport: "ontouchstart" in win || (nav.maxTouchPoints ?? 0) > 0,
    online: nav.onLine,
  };
}
