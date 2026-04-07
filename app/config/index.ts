export const server = process.env.NEXT_PUBLIC_SERVER_URL || "127.0.0.1";
export const port =
  process.env.NEXT_PUBLIC_SERVER_PORT || process.env.NEXT_PUBLIC_PORT || "30111";
export const baseURL =
  server && port ? `http://${server}:${port}` : "";
