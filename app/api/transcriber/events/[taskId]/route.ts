import { NextRequest } from "next/server";
import { resolveAuthenticatedSession } from "@/app/lib/auth-session";
import { transcriberServiceFetch } from "@/app/lib/transcriber-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const session = await resolveAuthenticatedSession();
  if (!session.ok || !session.accessToken) {
    return Response.json({ detail: session.message }, { status: session.status });
  }

  const { taskId } = await context.params;
  const response = await transcriberServiceFetch(
    `/events/transcribe-progress/${encodeURIComponent(taskId)}`,
    { method: "GET", accessToken: session.accessToken },
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
