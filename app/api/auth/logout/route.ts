import { NextResponse } from "next/server";
import type { AuthActionResponse } from "@/app/lib/auth";
import {
  authServiceRequest,
  clearAuthCookies,
  getCookieStore,
  hasServiceFailure,
  parseAuthServiceMessage,
  readAuthCookies,
} from "@/app/lib/auth-service";

export async function POST() {
  const cookieStore = await getCookieStore();
  const { accessToken } = readAuthCookies(cookieStore);

  let message = "Сессия завершена.";
  let revoked = false;

  if (accessToken) {
    try {
      const response = await authServiceRequest("/api/v1/token/revoke", {
        method: "POST",
        accessToken,
      });

      if (response.ok && !hasServiceFailure(response.payload)) {
        message = parseAuthServiceMessage(response.payload, message);
        revoked = true;
      }
    } catch {
      message = "Сессия завершена локально.";
    }
  }

  clearAuthCookies(cookieStore);

  return NextResponse.json<AuthActionResponse>({
    success: true,
    message,
    revoked,
  });
}
