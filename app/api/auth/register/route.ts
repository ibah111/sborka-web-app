import { NextRequest, NextResponse } from "next/server";
import type { AuthActionResponse, RegisterRequestBody } from "@/app/lib/auth";
import {
  authServiceRequest,
  hasServiceFailure,
  parseAuthServiceMessage,
} from "@/app/lib/auth-service";

function isValidRegisterBody(body: unknown): body is RegisterRequestBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as RegisterRequestBody).fio === "string" &&
    (body as RegisterRequestBody).fio.trim().length > 0 &&
    typeof (body as RegisterRequestBody).email === "string" &&
    (body as RegisterRequestBody).email.trim().length > 0 &&
    typeof (body as RegisterRequestBody).password === "string" &&
    (body as RegisterRequestBody).password.trim().length > 0 &&
    typeof (body as RegisterRequestBody).position === "string" &&
    (body as RegisterRequestBody).position.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!isValidRegisterBody(body)) {
    return NextResponse.json<AuthActionResponse>(
      {
        success: false,
        message: "Укажите fio, email, password и position.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await authServiceRequest("/api/v1/register", {
      method: "POST",
      body,
    });

    if (!response.ok || hasServiceFailure(response.payload)) {
      return NextResponse.json<AuthActionResponse>(
        {
          success: false,
          message: parseAuthServiceMessage(
            response.payload,
            "Не удалось выполнить регистрацию.",
          ),
        },
        { status: response.status >= 400 ? response.status : 400 },
      );
    }

    return NextResponse.json<AuthActionResponse>({
      success: true,
      message: parseAuthServiceMessage(
        response.payload,
        "Регистрация прошла успешно.",
      ),
    });
  } catch {
    return NextResponse.json<AuthActionResponse>(
      {
        success: false,
        message: "Не удалось связаться с auth service.",
      },
      { status: 502 },
    );
  }
}
