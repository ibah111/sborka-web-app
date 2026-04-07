import "server-only";

import { cookies } from "next/headers";
import type { AuthTokens, AuthUser } from "@/app/lib/auth";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

type JsonRecord = Record<string, unknown>;

export interface AuthServiceResponse {
  ok: boolean;
  status: number;
  payload: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function getConfiguredBaseUrl(): string {
  const directUrl = process.env.AUTH_SERVICE_URL?.trim();
  if (directUrl) {
    return directUrl.replace(/\/+$/, "");
  }

  const host = process.env.NEXT_PUBLIC_SERVER_URL?.trim();
  const port = process.env.NEXT_PUBLIC_SERVER_PORT?.trim();

  if (!host) {
    throw new Error(
      "AUTH_SERVICE_URL or NEXT_PUBLIC_SERVER_URL must be configured",
    );
  }

  const protocol = /^https?:\/\//i.test(host) ? "" : "http://";
  const normalizedHost = `${protocol}${host}`.replace(/\/+$/, "");

  return port ? `${normalizedHost}:${port}` : normalizedHost;
}

function toServiceUrl(path: string): string {
  const baseUrl = getConfiguredBaseUrl();
  return path.startsWith("/")
    ? `${baseUrl}${path}`
    : `${baseUrl}/${path}`;
}

function unwrapPayload(payload: unknown): JsonRecord | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (isRecord(payload.data)) {
    return payload.data;
  }

  return payload;
}

export function parseAuthServiceMessage(
  payload: unknown,
  fallback: string,
): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (isRecord(payload.message)) {
    const nestedMessage = payload.message.message;
    if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
      return nestedMessage;
    }

    const nestedError = payload.message.error;
    if (typeof nestedError === "string" && nestedError.trim().length > 0) {
      return nestedError;
    }
  }

  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    return payload.error;
  }

  return fallback;
}

export function hasServiceFailure(payload: unknown): boolean {
  return isRecord(payload) && payload.success === false;
}

export function extractAuthTokens(payload: unknown): AuthTokens | null {
  const data = unwrapPayload(payload);
  if (!data) {
    return null;
  }

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

export function extractAuthUser(payload: unknown): AuthUser | null {
  const data = unwrapPayload(payload);
  if (!data) {
    return null;
  }

  const email = data.email;
  const userId = data.user_id;

  if (typeof email !== "string" && typeof userId !== "number" && typeof userId !== "string") {
    return null;
  }

  return data as AuthUser;
}

export async function authServiceRequest(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    accessToken?: string | null;
  } = {},
): Promise<AuthServiceResponse> {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (init.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }

  const response = await fetch(toServiceUrl(path), {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export async function getCookieStore() {
  return cookies();
}

export function readAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
  };
}

export function setAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  tokens: AuthTokens,
) {
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    httpOnly: true,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
    sameSite: "lax",
    secure,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
    sameSite: "lax",
    secure,
  });
}

export function clearAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
