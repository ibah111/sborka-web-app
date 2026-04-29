import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";
import {
  readTranscriberPayload,
  transcriberServiceFetch,
} from "@/app/lib/transcriber-service";

function getSessionUserId(user: { user_id?: number | string } | null): number | null {
  if (!user) {
    return null;
  }

  const userId = Number(user.user_id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function POST(_request: NextRequest) {
  const session = await resolveAuthenticatedSession();

  if (!session.ok || !session.accessToken) {
    return NextResponse.json(
      { detail: session.message },
      { status: session.status >= 400 ? session.status : 401 },
    );
  }

  const userId = getSessionUserId(session.user);
  if (userId === null) {
    return NextResponse.json(
      { detail: "Не удалось определить user_id текущей сессии." },
      { status: 401 },
    );
  }

  try {
    const response = await transcriberServiceFetch("/transcripts", {
      method: "POST",
      accessToken: session.accessToken,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });
    const payload = await readTranscriberPayload(response);

    return NextResponse.json(payload ?? { items: [], total: 0 }, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Не удалось связаться с transcriber service." },
      { status: 502 },
    );
  }
}
