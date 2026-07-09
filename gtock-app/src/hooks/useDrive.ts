import { useInfiniteQuery } from "@tanstack/react-query";
import { listVideos } from "../utils/drive";
import type { Video } from "../types/Video";

const PAGE_SIZE = 12;

async function fetchFolderPage({ folderId, pageToken }: { folderId: string; pageToken?: string | null }) {
  return listVideos(folderId, PAGE_SIZE, pageToken);
}

export function useDriveVideos(folderIds: string[] | null) {
  return useInfiniteQuery({
    queryKey: ["videos", folderIds],
    queryFn: async ({ pageParam, queryKey }) => {
      const ids = queryKey[1] as string[];
      const tokens = (pageParam || {}) as Record<string, string | null>;

      const results = await Promise.all(
        ids.map((folderId) => fetchFolderPage({ folderId, pageToken: tokens[folderId] }))
      );

      const allVideos: Video[] = [];
      const nextTokens: Record<string, string | null> = {};
      let hasMore = false;

      results.forEach((result, index) => {
        const folderId = ids[index];
        allVideos.push(...result.videos);
        nextTokens[folderId] = result.nextPageToken;
        if (result.nextPageToken) hasMore = true;
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
  });
}
