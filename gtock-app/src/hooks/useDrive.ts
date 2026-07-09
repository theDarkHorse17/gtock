import { useQuery } from "@tanstack/react-query";
import { listVideos } from "../utils/drive";
import type { Video } from "../types/Video";

async function fetchAllVideos(folderIds: string[]): Promise<Video[]> {
  const results = await Promise.all(folderIds.map((id) => listVideos(id)));
  return results.flat();
}

export function useDriveVideos(folderIds: string[] | null) {
  return useQuery({
    queryKey: ["videos", folderIds],
    queryFn: () => fetchAllVideos(folderIds!),
    enabled: !!folderIds && folderIds.length > 0,
  });
}
