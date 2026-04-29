import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";
import { transcriberServiceFetch } from "@/app/lib/transcriber-service";

export const runtime = "nodejs";

function extractErrorDetail(rawText: string, fallback: string): string {
  if (!rawText) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawText) as {
      detail?: string;
      error?: string;
      message?: string;
    };

    if (typeof parsed.detail === "string" && parsed.detail.trim().length > 0) {
      return parsed.detail;
    }

    if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
      return parsed.error;
    }

    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return parsed.message;
    }
  } catch {
    return rawText;
  }

  return fallback;
}

function getSessionUserId(user: { user_id?: number | string } | null): number | null {
  if (!user) {
    return null;
  }

  const userId = Number(user.user_id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function POST(request: NextRequest) {
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

  const incomingFormData = await request.formData().catch(() => null);
  if (!incomingFormData) {
    return NextResponse.json(
      { detail: "Не удалось прочитать multipart/form-data." },
      { status: 400 },
    );
  }

  const file = incomingFormData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: "Поле file обязательно и должно содержать файл." },
      { status: 400 },
    );
  }

  const outboundFormData = new FormData();
  outboundFormData.append("file", file, file.name);
  outboundFormData.append("user_id", String(userId));

  for (const fieldName of ["task_id", "whisper_model", "whisper_device"] as const) {
    const value = incomingFormData.get(fieldName);
    if (typeof value === "string" && value.trim().length > 0) {
      outboundFormData.append(fieldName, value.trim());
    }
  }

  try {
    const response = await transcriberServiceFetch("/transcribe", {
      method: "POST",
      accessToken: session.accessToken,
      body: outboundFormData,
    });

    const rawText = await response.text().catch(() => "");

    if (!response.ok) {
      return NextResponse.json(
        {
          detail: extractErrorDetail(
            rawText,
            "Transcriber service завершился с ошибкой.",
          ),
        },
        { status: response.status },
      );
    }

    const rawTranscriptionId = response.headers.get("X-Transcription-ID");
    const parsedTranscriptionId = rawTranscriptionId ? Number(rawTranscriptionId) : null;
    const incomingTaskId = incomingFormData.get("task_id");

    return NextResponse.json(
      {
        taskId:
          response.headers.get("X-Task-ID") ??
          (typeof incomingTaskId === "string" ? incomingTaskId : null),
        transcriptionId:
          typeof parsedTranscriptionId === "number" && Number.isFinite(parsedTranscriptionId)
            ? parsedTranscriptionId
            : null,
        transcriptText: rawText,
      },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { detail: "Не удалось связаться с transcriber service." },
      { status: 502 },
    );
  }
}
