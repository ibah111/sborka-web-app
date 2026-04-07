import { NextResponse } from "next/server";
import { authServiceRequest } from "@/app/lib/auth-service";

export async function GET() {
  try {
    const res = await authServiceRequest("/api/v1/healthcheck");
    return NextResponse.json(res.payload ?? { message: "OK" }, {
      status: res.ok ? 200 : res.status,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
