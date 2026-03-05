export const server = process.env.NEXT_PUBLIC_SERVER_URL;
export const port = process.env.NEXT_PUBLIC_SERVER_PORT;
export const baseURL =
  server && port ? `http://${server}:${port}` : "";
