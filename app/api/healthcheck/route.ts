import { NextResponse } from "next/server";
import { axiosInstance } from "../base-request";

export async function GET() {
  try {
    const res = await axiosInstance.get("/");
    return NextResponse.json(res.data ?? { message: "OK" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
