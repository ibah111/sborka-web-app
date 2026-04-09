import { NextResponse } from "next/server";
import {
  readTranscriberPayload,
  transcriberServiceFetch,
} from "@/app/lib/transcriber-service";

export async function GET() {
  try {
    const response = await transcriberServiceFetch("/transcribe/devices", {
      method: "GET",
    });
    const payload = await readTranscriberPayload(response);

    return NextResponse.json(payload ?? { whisper_devices: [] }, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Не удалось связаться с transcriber service." },
      { status: 502 },
    );
  }
}
