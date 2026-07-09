import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import type { Video } from "../types/Video";
import { VideoPlayer } from "./VideoPlayer";

interface FeedProps {
  videos: Video[];
  folderId: string;
  startVideoId?: string | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onChangeFolder?: () => void;
  onLikedChange?: () => void;
}

export function readLiked(): Array<{ id: string; name: string; folderId: string }> {
  try {
    const raw = localStorage.getItem("gtock:liked");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLiked(videos: Array<{ id: string; name: string; folderId: string }>) {
  try {
    localStorage.setItem("gtock:liked", JSON.stringify(videos));
  } catch {
    // ignore
  }
}

export function toggleLiked(video: Video, folderId: string) {
  const liked = readLiked();
  const exists = liked.find((v) => v.id === video.id);
  if (exists) {
    writeLiked(liked.filter((v) => v.id !== video.id));
  } else {
    writeLiked([...liked, { id: video.id, name: video.name, folderId }]);
  }
}

const BAD_KEY = "gtock:bad";

export function readBadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(BAD_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markBad(videoId: string) {
  const bad = readBadIds();
  bad.add(videoId);
  try { localStorage.setItem(BAD_KEY, JSON.stringify([...bad])); } catch {}
}

const LAST_KEY_PREFIX = "gtock:last:";

function readLastVideoId(folderId: string): string | null {
  try { return localStorage.getItem(LAST_KEY_PREFIX + folderId); } catch { return null; }
}

function writeLastVideoId(folderId: string, videoId: string) {
  try { localStorage.setItem(LAST_KEY_PREFIX + folderId, videoId); } catch {}
}

const monoStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const controlButtonBase = {
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",
  background: "var(--control-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--control-border)",
  color: "rgba(255,255,255,0.9)",
  transition: "background-color 200ms var(--ease-out), transform 100ms var(--ease-out), border-color 200ms var(--ease-out)",
};

const LOAD_MORE_THRESHOLD = 4;

export function Feed({ videos, folderId, startVideoId, hasMore, isLoadingMore, onLoadMore, onChangeFolder, onLikedChange }: FeedProps) {
  const [badVersion, setBadVersion] = useState(0);
  const badIds = readBadIds();
  const goodVideos = useMemo(() => videos.filter((v) => !badIds.has(v.id)), [videos, badVersion]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liked, setLiked] = useState(() => {
    return readLiked().some((v) => v.id === goodVideos[0]?.id);
  });
  const [likeBounce, setLikeBounce] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const currentVideo = goodVideos[currentIndex] ?? goodVideos[0];
  const lastSavedId = useRef<string | null>(null);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(goodVideos.length - 1, 0)));
  }, [goodVideos.length]);

  useEffect(() => {
    if (startVideoId && goodVideos.length > 0) {
      const idx = goodVideos.findIndex((v) => v.id === startVideoId);
      if (idx >= 0) setCurrentIndex(idx);
    } else {
      const saved = readLastVideoId(folderId);
      if (saved && goodVideos.length > 0) {
        const idx = goodVideos.findIndex((v) => v.id === saved);
        if (idx >= 0) setCurrentIndex(idx);
      }
    }
  }, [startVideoId, goodVideos, folderId]);

  useEffect(() => {
    setLiked(readLiked().some((v) => v.id === currentVideo?.id));
    if (currentVideo && lastSavedId.current !== currentVideo.id) {
      lastSavedId.current = currentVideo.id;
      writeLastVideoId(folderId, currentVideo.id);
    }
  }, [currentVideo?.id]);

  // Auto-load more videos when approaching end
  useEffect(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      const remaining = goodVideos.length - currentIndex - 1;
      if (remaining <= LOAD_MORE_THRESHOLD) {
        onLoadMore();
      }
    }
  }, [currentIndex, goodVideos.length, hasMore, isLoadingMore, onLoadMore]);

  const goToNext = useCallback(() => {
    const maxIndex = Math.max(goodVideos.length - 1, 0);
    setCurrentIndex((index) => Math.min(index + 1, maxIndex));
    setIsPlaying(true);
  }, [goodVideos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
    setIsPlaying(true);
  }, []);

  const lastNavTime = useRef(0);
  const debouncedGoToNext = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 300) return;
    lastNavTime.current = now;
    goToNext();
  }, [goToNext]);

  const debouncedGoToPrevious = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTime.current < 300) return;
    lastNavTime.current = now;
    goToPrevious();
  }, [goToPrevious]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  // Keyboard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          goToPrevious();
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((v) => !v);
          break;
        case "m":
        case "M":
          e.preventDefault();
          setIsMuted((v) => !v);
          break;
        case "c":
        case "C":
          e.preventDefault();
          setIsCinemaMode((v) => !v);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (isCinemaMode) {
            e.preventDefault();
            setIsCinemaMode(false);
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, isCinemaMode, toggleFullscreen]);

  // Wheel
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < 50) return;
      e.preventDefault();
      if (e.deltaY > 0) debouncedGoToNext();
      else debouncedGoToPrevious();
    }

    const container = containerRef.current;
    if (container) container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      if (container) container.removeEventListener("wheel", handleWheel);
    };
  }, [debouncedGoToNext, debouncedGoToPrevious, goodVideos.length]);

  // Touch
  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    touchEndY.current = e.touches[0].clientY;
  }

  function handleTouchEnd() {
    const diff = touchStartY.current - touchEndY.current;
    if (diff > 50) goToNext();
    else if (diff < -50) goToPrevious();
  }

  // Fullscreen sync
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function handleLike() {
    if (!currentVideo) return;
    toggleLiked(currentVideo, folderId);
    setLiked((v) => !v);
    setLikeBounce(true);
    setTimeout(() => setLikeBounce(false), 400);
    onLikedChange?.();
  }

  if (goodVideos.length === 0 || !currentVideo) {
    return (
      <div
        className="flex h-dvh flex-col items-center justify-center gap-4 px-6 animate-fade-in"
        style={{ background: "var(--video-canvas)", color: "var(--fg-muted)", fontSize: "14px" }}
      >
        <div
          className="w-12 h-12 flex items-center justify-center"
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "14px",
            background: "var(--bg-secondary)",
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p>{videos.length === 0 ? "No videos found" : "All videos marked as bad"}</p>
        {videos.length === 0 && hasMore && isLoadingMore && (
          <div
            className="animate-spin-smooth"
            style={{
              width: "18px",
              height: "18px",
              border: "2px solid rgba(255,255,255,0.08)",
              borderTopColor: "rgba(255,255,255,0.6)",
              borderRadius: "50%",
            }}
          />
        )}
      </div>
    );
  }

  const remainingCount = Math.max(goodVideos.length - currentIndex - 1, 0);
  const showLoadMoreIndicator = isLoadingMore && remainingCount <= LOAD_MORE_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="relative h-dvh overflow-hidden"
      style={{ background: "var(--video-canvas)" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <VideoPlayer
        video={currentVideo}
        isPlaying={isPlaying}
        isMuted={isMuted}
        isLooping={isLooping}
        isCinemaMode={isCinemaMode}
        isFullscreen={isFullscreen}
        onEnded={goToNext}
        onToggleCinema={() => setIsCinemaMode((v) => !v)}
        onToggleFullscreen={toggleFullscreen}
        onMarkBad={() => {
          markBad(currentVideo.id);
          setBadVersion((v) => v + 1);
          goToNext();
        }}
      />

      {/* Normal mode controls */}
      {!isCinemaMode && (
        <>
          {/* Top left - back + counter */}
          <div
            className="absolute left-5 top-5 z-10 flex items-center gap-2 animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <button
              type="button"
              onClick={onChangeFolder}
              className="btn-press"
              style={controlButtonBase}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--control-bg)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div
              className="px-3.5 py-2.5"
              style={{
                ...monoStyle,
                borderRadius: "14px",
                background: "var(--control-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--control-border)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {currentIndex + 1} / {goodVideos.length}
            </div>
          </div>

          {/* Load more indicator */}
          {showLoadMoreIndicator && (
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-24 z-20 flex items-center gap-2 px-3 py-1.5 animate-fade-in"
              style={{
                ...monoStyle,
                borderRadius: "999px",
                background: "var(--control-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--control-border)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <div
                className="animate-spin-smooth"
                style={{
                  width: "12px",
                  height: "12px",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  borderTopColor: "rgba(255,255,255,0.8)",
                  borderRadius: "50%",
                }}
              />
              Loading more
            </div>
          )}

          {/* Right side controls */}
          {!isFullscreen && (
          <div
            className="absolute right-5 bottom-32 z-20 flex flex-col items-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              className="btn-press"
              style={{
                ...controlButtonBase,
                color: liked ? "var(--danger)" : "rgba(255,255,255,0.9)",
                transform: likeBounce ? "scale(1.16)" : "scale(1)",
                transition: "transform 380ms var(--ease-spring), background-color 200ms var(--ease-out), border-color 200ms var(--ease-out), color 200ms var(--ease-out)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--control-bg)")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {/* Mute */}
            <button
              type="button"
              onClick={() => setIsMuted((v) => !v)}
              className="btn-press"
              style={controlButtonBase}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--control-bg)")}
            >
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            {/* Loop */}
            <button
              type="button"
              onClick={() => setIsLooping((v) => !v)}
              className="btn-press"
              style={{
                ...controlButtonBase,
                color: isLooping ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.55)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--control-bg)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
          </div>
          )}
        </>
      )}
    </div>
  );
}
