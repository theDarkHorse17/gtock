import type { Video } from "../types/Video";

const CORS_PROXY = import.meta.env.VITE_CORS_PROXY;
const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "video/x-msvideo",
  "video/mpeg",
]);

function buildProxyUrl(params: Record<string, string>) {
  if (!CORS_PROXY) {
    throw new Error("VITE_CORS_PROXY is not configured.");
  }

  const url = new URL(CORS_PROXY, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export async function listVideos(folderId: string): Promise<Video[]> {
  const url = buildProxyUrl({ folderId });

  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Failed to load videos (${response.status})`);
  }

  const files = Array.isArray(data?.files) ? data.files : [];

  return files
    .filter((file: any) => file?.id && file?.name && VIDEO_MIMES.has(file.mimeType))
    .map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdTime: file.createdTime,
      videoUrl: buildProxyUrl({ fileId: file.id }),
    }));
}

export async function getFolderName(folderId: string): Promise<string | null> {
  const url = buildProxyUrl({ folderId, folderName: "true" });

  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error) {
    return null;
  }

  return data?.name || null;
}
