import { NextResponse } from "next/server";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";
import {
  readTranscriberPayload,
  transcriberServiceFetch,
} from "@/app/lib/transcriber-service";

export async function GET() {
  const session = await resolveAuthenticatedSession();
  if (!session.ok || !session.accessToken) {
    return NextResponse.json({ detail: session.message }, { status: session.status });
  }
  try {
    const response = await transcriberServiceFetch("/transcribe/models", {
      method: "GET",
      accessToken: session.accessToken,
    });
    const payload = await readTranscriberPayload(response);

    return NextResponse.json(payload ?? { whisper_models: [] }, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Не удалось связаться с transcriber service." },
      { status: 502 },
    );
  }
}
