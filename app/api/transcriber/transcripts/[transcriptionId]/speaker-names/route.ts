import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";
import { readTranscriberPayload, transcriberServiceFetch } from "@/app/lib/transcriber-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ transcriptionId: string }> }) {
  const session = await resolveAuthenticatedSession();
  if (!session.ok || !session.accessToken) {
    return NextResponse.json({ detail: session.message }, { status: session.status >= 400 ? session.status : 401 });
  }

  const { transcriptionId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Ожидается объект с именами спикеров." }, { status: 400 });
  }

  try {
    const response = await transcriberServiceFetch(`/transcripts/${encodeURIComponent(transcriptionId)}/speaker-names`, {
      method: "PATCH",
      accessToken: session.accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await readTranscriberPayload(response), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Не удалось сохранить имена спикеров." }, { status: 502 });
  }
}
