import { useInfiniteQuery } from "@tanstack/react-query";
import { listVideos } from "../utils/drive";
import type { Video } from "../types/Video";

const PAGE_SIZE = 15;

export interface VideoPage {
  videos: Video[];
  nextPageToken: Record<string, string | null> | null;
}

export function useDriveVideos(folderIds: string[] | null) {
  return useInfiniteQuery({
    queryKey: ["videos", folderIds || []] as const,
    queryFn: async ({ pageParam }: { pageParam: Record<string, string | null> }) => {
      const ids = folderIds || [];
      const tokens = pageParam || {};

      // Only fetch folders that still have pages. On first fetch, all folders.
      const foldersToFetch = ids.filter((folderId) => {
        const token = tokens[folderId];
        return token !== undefined ? token !== null : true;
      });

      const results = await Promise.all(
        foldersToFetch.map((folderId) =>
          listVideos(folderId, PAGE_SIZE, tokens[folderId] || undefined)
        )
      );

      const allVideos: Video[] = [];
      const nextTokens: Record<string, string | null> = { ...tokens };
      let hasMore = false;

      results.forEach((result, index) => {
        const folderId = foldersToFetch[index];
        allVideos.push(...result.videos);
        nextTokens[folderId] = result.nextPageToken;
        if (result.nextPageToken) hasMore = true;
      });

      // Mark exhausted folders explicitly
      ids.forEach((folderId) => {
        if (!foldersToFetch.includes(folderId)) {
          nextTokens[folderId] = null;
        }
      });

      // Sort by created time descending for a fresh feed feel
      allVideos.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

      return {
        videos: allVideos,
        nextPageToken: hasMore ? nextTokens : null,
      };
    },
    initialPageParam: {} as Record<string, string | null>,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    enabled: !!folderIds && folderIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
