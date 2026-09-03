export type WorkspaceServiceId = "overview" | "transcriber" | "video-downloader";

export interface WorkspaceServiceDefinition {
  id: WorkspaceServiceId;
  href: string;
  title: string;
  tagline: string;
  description: string;
  status: "ready";
}

export const workspaceServices: WorkspaceServiceDefinition[] = [
  {
    id: "overview",
    href: "/",
    title: "Каталог",
    tagline: "Главная панель сервисов",
    description: "Быстрый переход к доступным рабочим инструментам.",
    status: "ready",
  },
  {
    id: "transcriber",
    href: "/transcriber",
    title: "Transcriber",
    tagline: "Аудио/видео -> текст с живым SSE-прогрессом",
    description:
      "Загрузка аудио и видео, потоковая транскрибация через Whisper и просмотр истории сохранённых расшифровок.",
    status: "ready",
  },
  {
    id: "video-downloader",
    href: "/video-downloader",
    title: "Video Downloader",
    tagline: "YouTube / Instagram / TikTok -> видео или текст",
    description: "Скачивание видео по ссылке с возможностью сразу запустить транскрибацию и диаризацию.",
    status: "ready",
  },
];

export const publishedWorkspaceServices = workspaceServices.filter(
  (item) => item.id !== "overview",
);
