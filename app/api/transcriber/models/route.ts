import { NextResponse } from "next/server";
import {
  readTranscriberPayload,
  transcriberServiceFetch,
} from "@/app/lib/transcriber-service";

export async function GET() {
  try {
    const response = await transcriberServiceFetch("/transcribe/models", {
      method: "GET",
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
