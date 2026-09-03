import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";
import { transcriberServiceFetch } from "@/app/lib/transcriber-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await resolveAuthenticatedSession();
  if (!session.ok || !session.accessToken) {
    return NextResponse.json({ detail: session.message }, { status: session.status >= 400 ? session.status : 401 });
  }
  const incoming = await request.formData().catch(() => null);
  const url = incoming?.get("url");
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ detail: "Укажите ссылку на видео." }, { status: 400 });
  }
  const outbound = new FormData();
  for (const field of ["url", "transcribe", "enable_diarization", "whisper_model", "task_id"] as const) {
    const value = incoming?.get(field);
    if (typeof value === "string" && value.trim()) outbound.append(field, value.trim());
  }
  try {
    const response = await transcriberServiceFetch("/ytdl/download", {
      method: "POST", accessToken: session.accessToken, body: outbound,
    });
    const headers = new Headers();
    for (const name of ["content-type", "content-disposition", "content-length"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return NextResponse.json({ detail: "Не удалось связаться с transcriber service." }, { status: 502 });
  }
}
