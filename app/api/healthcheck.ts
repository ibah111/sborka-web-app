export async function healthcheck(): Promise<{ message: string }> {
  try {
    const response = await fetch("/api/healthcheck", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return { message: "Internal server error" };
    }

    return (await response.json()) as { message: string };
  } catch {
    return { message: "Internal server error" };
  }
}
