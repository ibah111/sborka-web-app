export type WorkspaceServiceId = "overview" | "transcriber";

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
    tagline: "MP3/MP4 -> текст c живым прогрессом",
    description:
      "Загрузка аудио и видео, потоковая транскрибация через Whisper и просмотр истории сохранённых расшифровок.",
    status: "ready",
  },
];

export const publishedWorkspaceServices = workspaceServices.filter(
  (item) => item.id !== "overview",
);
