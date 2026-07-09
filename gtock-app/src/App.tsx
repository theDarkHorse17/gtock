import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { extractFolderId } from "./utils/parser";
import { getFolderName } from "./utils/drive";
import { useDriveVideos } from "./hooks/useDrive";
import { Feed, readLiked } from "./components/Feed";
import { LikedPage } from "./components/LikedPage";
import {
  getSavedFolders,
  saveFolder,
  deleteSavedFolder,
  getLastUsedFolders,
  saveLastUsedFolders,
  type SavedFolder,
} from "./utils/storage";

const queryClient = new QueryClient();

type Page = "home" | "liked" | "feed";

const monoStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

function AppContent() {
  const [page, setPage] = useState<Page>("home");
  const [folderUrls, setFolderUrls] = useState<string[]>(() => {
    const lastUsed = getLastUsedFolders();
    return lastUsed.length > 0 ? lastUsed : [""];
  });
  const [startVideoId, setStartVideoId] = useState<string | null>(null);
  const [savedFolders, setSavedFolders] = useState<SavedFolder[]>(() =>
    getSavedFolders()
  );
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    if (page === "feed") {
      saveLastUsedFolders(folderUrls);
    }
  }, [folderUrls, page]);

  const parsedIds = folderUrls
    .map((url) => extractFolderId(url))
    .filter((id): id is string => id !== null);
  const uniqueIds = [...new Set(parsedIds)];

  const folderIds = page === "feed" && uniqueIds.length > 0 ? uniqueIds : null;
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useDriveVideos(folderIds);
  const videos = data?.pages.flatMap((page) => page.videos) || [];
  const likedCount = readLiked().length;

  function updateUrl(index: number, value: string) {
    setFolderUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addUrl() {
    setFolderUrls((prev) => [...prev, ""]);
  }

  function removeUrl(index: number) {
    setFolderUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function goHome() {
    setFolderUrls([""]);
    setPage("home");
  }

  function handleSaveFolder() {
    if (saveName.trim() && folderUrls.some((u) => u.trim())) {
      saveFolder(saveName.trim(), folderUrls);
      setSavedFolders(getSavedFolders());
      setSaveName("");
      setShowSaveInput(false);
    }
  }

  function handleDeleteFolder(id: string) {
    deleteSavedFolder(id);
    setSavedFolders(getSavedFolders());
  }

  function handleLoadFolder(urls: string[]) {
    setFolderUrls(urls.length > 0 ? urls : [""]);
    setStartVideoId(null);
    setPage("feed");
  }

  async function openSaveInput() {
    setShowSaveInput(true);
    const firstValidUrl = folderUrls.find((url) => extractFolderId(url));
    const firstFolderId = firstValidUrl ? extractFolderId(firstValidUrl) : null;
    if (firstFolderId) {
      const name = await getFolderName(firstFolderId);
      if (name) {
        setSaveName(name);
      }
    }
  }

  const hasInvalidUrl = folderUrls.some((u) => u.trim() && !extractFolderId(u));

  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--bg-primary)", color: "var(--fg-primary)" }}
    >
      {page === "liked" ? (
        <LikedPage
          onBack={() => setPage("home")}
          onPlay={(folderId, videoId) => {
            setFolderUrls([`https://drive.google.com/drive/folders/${folderId}`]);
            setStartVideoId(videoId);
            setPage("feed");
          }}
        />
      ) : page === "home" ? (
        <div
          className="min-h-dvh flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex-1 flex flex-col items-center px-6 py-8">
            <div className="w-full max-w-sm flex-1 flex flex-col justify-between">
              {/* Logo */}
              <div className="space-y-4 text-center animate-fade-in-up" style={{ paddingTop: "32px" }}>
                <img
                  src="/logo.svg"
                  alt="gtock"
                  className="w-14 h-14 mx-auto"
                  style={{ borderRadius: "16px" }}
                />
                <div className="space-y-1">
                  <h1
                    className="text-2xl font-semibold tracking-tight"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    gtock
                  </h1>
                  <p style={{ color: "var(--fg-muted)", fontSize: "14px" }}>
                    Paste a Drive folder link. Watch instantly.
                  </p>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
                {folderUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <input
                      type="text"
                      placeholder={`Folder URL ${i + 1}`}
                      value={url}
                      onChange={(e) => updateUrl(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && uniqueIds.length > 0) {
                          setStartVideoId(null);
                          setPage("feed");
                        }
                      }}
                      className="w-full text-sm outline-none transition-all"
                      style={{
                        padding: "14px 40px 14px 16px",
                        borderRadius: "12px",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--fg-primary)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.background = "var(--bg-secondary)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                        e.currentTarget.style.background = "var(--bg-input)";
                      }}
                    />
                    {folderUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUrl(i)}
                        className="btn-press absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--fg-subtle)" }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                {/* Add another link */}
                <button
                  type="button"
                  onClick={addUrl}
                  className="btn-press w-full flex items-center justify-center gap-2 text-xs"
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px dashed var(--border-default)",
                    color: "var(--fg-muted)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.color = "var(--fg-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.color = "var(--fg-muted)";
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add another folder
                </button>

                {/* Validation */}
                {hasInvalidUrl && (
                  <p className="text-xs" style={{ color: "var(--danger)" }}>
                    Some URLs are invalid
                  </p>
                )}

                {/* Count */}
                {uniqueIds.length > 0 && (
                  <p
                    className="text-xs text-center"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    {uniqueIds.length} folder{uniqueIds.length > 1 ? "s" : ""} detected
                  </p>
                )}

                {/* Watch button */}
                {uniqueIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartVideoId(null);
                      setPage("feed");
                    }}
                    className="btn-press-strong w-full text-sm font-medium"
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: "var(--fg-primary)",
                      color: "var(--bg-primary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--fg-primary)";
                    }}
                  >
                    Watch {uniqueIds.length > 1 ? `${uniqueIds.length} folders` : ""}
                  </button>
                )}

                {/* Save current links */}
                {uniqueIds.length > 0 && (
                  <div className="space-y-3">
                    {showSaveInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Name this folder..."
                          value={saveName}
                          onChange={(e) => setSaveName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveFolder();
                            if (e.key === "Escape") setShowSaveInput(false);
                          }}
                          className="flex-1 text-sm outline-none transition-all"
                          style={{
                            padding: "10px 12px",
                            borderRadius: "10px",
                            background: "var(--bg-input)",
                            border: "1px solid var(--border-default)",
                            color: "var(--fg-primary)",
                          }}
                          autoFocus
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-strong)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-default)";
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveFolder}
                          className="btn-press text-sm font-medium px-4"
                          style={{
                            borderRadius: "10px",
                            background: "var(--bg-tertiary)",
                            color: "var(--fg-primary)",
                            border: "1px solid var(--border-default)",
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSaveInput(false)}
                          className="btn-press text-sm px-3"
                          style={{
                            borderRadius: "10px",
                            background: "transparent",
                            color: "var(--fg-muted)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={openSaveInput}
                        className="btn-press w-full flex items-center justify-center gap-2 text-xs"
                        style={{
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px dashed var(--border-default)",
                          color: "var(--fg-muted)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--border-strong)";
                          e.currentTarget.style.color = "var(--fg-secondary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border-default)";
                          e.currentTarget.style.color = "var(--fg-muted)";
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Save these links
                      </button>
                    )}
                  </div>
                )}

                {/* Saved folders */}
                {savedFolders.length > 0 && (
                  <div
                    className="space-y-3"
                    style={{
                      paddingTop: "20px",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <p style={{ ...monoStyle, color: "var(--fg-subtle)" }}>
                      Saved Folders
                    </p>
                    <div className="space-y-2.5 max-h-44 overflow-y-auto">
                      {savedFolders.map((folder) => (
                        <div
                          key={folder.id}
                          className="flex items-center gap-2 group"
                        >
                          <button
                            type="button"
                            onClick={() => handleLoadFolder(folder.urls)}
                            className="flex-1 text-left transition-all"
                            style={{
                              padding: "10px 12px",
                              borderRadius: "10px",
                              background: "var(--bg-input)",
                              border: "1px solid var(--border-subtle)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--bg-tertiary)";
                              e.currentTarget.style.borderColor = "var(--border-default)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "var(--bg-input)";
                              e.currentTarget.style.borderColor = "var(--border-subtle)";
                            }}
                          >
                            <p
                              className="text-sm truncate"
                              style={{ color: "var(--fg-secondary)" }}
                            >
                              {folder.name}
                            </p>
                            <p
                              className="text-xs truncate"
                              style={{ color: "var(--fg-subtle)", marginTop: "2px" }}
                            >
                              {folder.urls.length} folder{folder.urls.length > 1 ? "s" : ""}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="btn-press p-2 rounded-lg transition-all"
                            style={{
                              color: "var(--fg-subtle)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--danger)";
                              e.currentTarget.style.background = "var(--danger-subtle)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--fg-subtle)";
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Liked button */}
                {likedCount > 0 && (
                  <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: "180ms" }}>
                    <button
                      type="button"
                      onClick={() => setPage("liked")}
                      className="btn-press flex items-center gap-2 px-4 py-2.5 text-sm"
                      style={{
                        borderRadius: "999px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-default)",
                        color: "var(--fg-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.color = "var(--fg-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-default)";
                        e.currentTarget.style.color = "var(--fg-secondary)";
                      }}
                    >
                      <svg className="w-4 h-4" style={{ color: "var(--danger)" }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span>Liked</span>
                      <span style={{ color: "var(--fg-subtle)" }}>{likedCount}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Features */}
              <div
                className="flex items-center justify-center gap-6 text-xs animate-fade-in-up"
                style={{ animationDelay: "120ms", color: "var(--fg-subtle)" }}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  No login
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Instant
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Free
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : isLoading ? (
        <div
          className="min-h-dvh flex flex-col items-center justify-center gap-4 px-5 animate-fade-in"
          style={{ background: "var(--video-canvas)" }}
        >
          <div
            className="animate-spin-smooth"
            style={{
              width: "22px",
              height: "22px",
              border: "2px solid rgba(255,255,255,0.08)",
              borderTopColor: "rgba(255,255,255,0.7)",
              borderRadius: "50%",
            }}
          />
          <p style={{ color: "var(--fg-muted)", fontSize: "14px" }}>Loading videos...</p>
        </div>
      ) : error ? (
        <div
          className="min-h-dvh flex items-center justify-center px-5 animate-fade-in"
          style={{ background: "var(--video-canvas)" }}
        >
          <div className="max-w-sm w-full text-center space-y-5">
            <div
              className="inline-flex items-center justify-center w-12 h-12"
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "14px",
                background: "var(--bg-secondary)",
              }}
            >
              <svg className="w-5 h-5" style={{ color: "var(--danger)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-medium">Failed to load</h2>
              <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
                Make sure all folders are shared as "Anyone with the link"
              </p>
            </div>
            <button
              type="button"
              onClick={goHome}
              className="btn-press text-sm font-medium"
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
                color: "var(--fg-primary)",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <Feed
          videos={videos || []}
          folderId={folderIds?.[0] || ""}
          startVideoId={startVideoId}
          hasMore={!!hasNextPage}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          onChangeFolder={goHome}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
