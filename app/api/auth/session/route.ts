import { NextResponse } from "next/server";
import type { AuthUser, SessionResponse } from "@/app/lib/auth";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";

function authenticatedResponse(user: AuthUser | null, refreshed = false) {
  return NextResponse.json<SessionResponse>({
    authenticated: true,
    user,
    refreshed,
  });
}

function unauthorizedResponse(
  reason: string,
  error: string,
  status = 401,
) {
  return NextResponse.json<SessionResponse>(
    {
      authenticated: false,
      user: null,
      reason,
      error,
    },
    { status },
  );
}

export async function GET() {
  const session = await resolveAuthenticatedSession();

  if (!session.ok) {
    return unauthorizedResponse(
      session.reason ?? "SESSION_INVALID",
      session.message,
      session.status,
    );
  }

  return authenticatedResponse(session.user, session.refreshed);
}

