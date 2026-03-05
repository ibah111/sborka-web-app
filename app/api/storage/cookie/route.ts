import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type SameSite = "lax" | "strict" | "none";

interface SetCookieBody {
  name?: unknown;
  value?: unknown;
  options?: {
    maxAge?: unknown;
    path?: unknown;
    domain?: unknown;
    sameSite?: unknown;
    secure?: unknown;
  };
}

interface DeleteCookieBody {
  name?: unknown;
  path?: unknown;
  domain?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseSameSite(value: unknown): SameSite | null {
  if (value === undefined) return "lax";
  if (value === "lax" || value === "strict" || value === "none") return value;
  return null;
}

function parseBoolean(value: unknown, fallback: boolean): boolean | null {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return null;
}

function parsePositiveNumber(value: unknown): number | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!isNonEmptyString(name)) {
    return NextResponse.json(
      { error: "Query param 'name' is required" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const exists = cookieStore.has(name);

  return NextResponse.json({ name, exists });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as SetCookieBody | null;

  if (!body || !isNonEmptyString(body.name) || typeof body.value !== "string") {
    return NextResponse.json(
      { error: "Body must contain string fields: 'name' and 'value'" },
      { status: 400 },
    );
  }

  const maxAge = parsePositiveNumber(body.options?.maxAge);
  if (maxAge === null) {
    return NextResponse.json(
      { error: "'options.maxAge' must be a positive number" },
      { status: 400 },
    );
  }

  const sameSite = parseSameSite(body.options?.sameSite);
  if (!sameSite) {
    return NextResponse.json(
      { error: "'options.sameSite' must be one of: lax, strict, none" },
      { status: 400 },
    );
  }

  const secure = parseBoolean(
    body.options?.secure,
    process.env.NODE_ENV === "production",
  );
  if (secure === null) {
    return NextResponse.json(
      { error: "'options.secure' must be boolean" },
      { status: 400 },
    );
  }

  if (sameSite === "none" && !secure) {
    return NextResponse.json(
      { error: "Cookies with sameSite='none' must have secure=true" },
      { status: 400 },
    );
  }

  const path = body.options?.path;
  if (path !== undefined && typeof path !== "string") {
    return NextResponse.json(
      { error: "'options.path' must be a string" },
      { status: 400 },
    );
  }

  const domain = body.options?.domain;
  if (domain !== undefined && typeof domain !== "string") {
    return NextResponse.json(
      { error: "'options.domain' must be a string" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(body.name, body.value, {
    httpOnly: true,
    path: path ?? "/",
    domain,
    maxAge,
    sameSite,
    secure,
  });

  return NextResponse.json({ ok: true, name: body.name });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as DeleteCookieBody | null;

  if (!body || !isNonEmptyString(body.name)) {
    return NextResponse.json(
      { error: "Body must contain string field: 'name'" },
      { status: 400 },
    );
  }

  const path = body.path;
  if (path !== undefined && typeof path !== "string") {
    return NextResponse.json({ error: "'path' must be a string" }, { status: 400 });
  }

  const domain = body.domain;
  if (domain !== undefined && typeof domain !== "string") {
    return NextResponse.json(
      { error: "'domain' must be a string" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete({
    name: body.name,
    path: path ?? "/",
    domain,
  });

  return NextResponse.json({ ok: true, name: body.name });
}
