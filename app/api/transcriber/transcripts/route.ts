import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";
import {
  readTranscriberPayload,
  transcriberServiceFetch,
} from "@/app/lib/transcriber-service";

export async function GET(request: NextRequest) {
  const session = await resolveAuthenticatedSession();

  if (!session.ok || !session.accessToken) {
    return NextResponse.json(
      { detail: session.message },
      { status: session.status >= 400 ? session.status : 401 },
    );
  }

  const queryString = request.nextUrl.searchParams.toString();
  const path = queryString ? `/transcripts?${queryString}` : "/transcripts";

  try {
    const response = await transcriberServiceFetch(path, {
      method: "GET",
      accessToken: session.accessToken,
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
