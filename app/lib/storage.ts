export type SameSite = "lax" | "strict" | "none";

export interface HttpOnlyCookieOptions {
  maxAge?: number;
  path?: string;
  domain?: string;
  sameSite?: SameSite;
  secure?: boolean;
}

interface CookieExistsResponse {
  name: string;
  exists: boolean;
}

interface CookieMutationResponse {
  ok: boolean;
  name: string;
}

const COOKIE_API_PATH = "/api/storage/cookie";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseLocalStorageValue<T>(raw: string): T | string {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload.error === "string"
        ? payload.error
        : `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

export const storage = {
  local: {
    get<T = unknown>(key: string): T | string | null {
      if (!canUseLocalStorage()) return null;
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return parseLocalStorageValue<T>(raw);
    },
    set<T>(key: string, value: T): void {
      if (!canUseLocalStorage()) return;
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key: string): void {
      if (!canUseLocalStorage()) return;
      window.localStorage.removeItem(key);
    },
    clear(): void {
      if (!canUseLocalStorage()) return;
      window.localStorage.clear();
    },
  },
  httpOnlyCookie: {
    async exists(name: string): Promise<boolean> {
      const params = new URLSearchParams({ name });
      const data = await requestJson<CookieExistsResponse>(
        `${COOKIE_API_PATH}?${params.toString()}`,
        { method: "GET" },
      );
      return data.exists;
    },
    async set(
      name: string,
      value: string,
      options?: HttpOnlyCookieOptions,
    ): Promise<void> {
      await requestJson<CookieMutationResponse>(COOKIE_API_PATH, {
        method: "POST",
        body: JSON.stringify({ name, value, options }),
      });
    },
    async remove(
      name: string,
      options?: Pick<HttpOnlyCookieOptions, "path" | "domain">,
    ): Promise<void> {
      await requestJson<CookieMutationResponse>(COOKIE_API_PATH, {
        method: "DELETE",
        body: JSON.stringify({ name, ...options }),
      });
    },
  },
};
