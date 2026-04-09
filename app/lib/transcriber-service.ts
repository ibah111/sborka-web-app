import "server-only";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function getConfiguredBaseUrls(): string[] {
  const directUrl = process.env.TRANSCRIBER_SERVICE_URL?.trim();
  const fallbackUrl = process.env.TRANSCRIBER_SERVICE_FALLBACK_URL?.trim();

  const candidates = [
    directUrl ? normalizeBaseUrl(directUrl) : null,
    fallbackUrl ? normalizeBaseUrl(fallbackUrl) : null,
    "http://127.0.0.1:8000",
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

function toServiceUrl(baseUrl: string, path: string): string {
  return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
}

export async function transcriberServiceFetch(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<Response> {
  const baseUrls = getConfiguredBaseUrls();
  let lastError: unknown = null;

  for (const baseUrl of baseUrls) {
    const headers = new Headers(init.headers);

    headers.set("Accept", "application/json, text/plain;q=0.9, */*;q=0.8");

    if (init.accessToken) {
      headers.set("Authorization", `Bearer ${init.accessToken}`);
    }

    const url = toServiceUrl(baseUrl, path);

    try {
      return await fetch(url, {
        ...init,
        headers,
        cache: "no-store",
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Transcriber service is unavailable");
}

export async function readTranscriberPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  if (!text) {
    return null;
  }

  return { detail: text };
}
