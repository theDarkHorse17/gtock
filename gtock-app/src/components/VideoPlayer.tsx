import { useRef, useEffect, useState, useCallback } from "react";
import type { Video } from "../types/Video";

interface VideoPlayerProps {
  video: Video;
  isPlaying: boolean;
  isMuted: boolean;
  isLooping: boolean;
  isCinemaMode: boolean;
  isFullscreen?: boolean;
  onEnded?: () => void;
  onToggleCinema?: () => void;
  onToggleFullscreen?: () => void;
  onMarkBad?: () => void;
}

const monoStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

export function VideoPlayer({ video, isPlaying, isMuted, isLooping, isCinemaMode, isFullscreen, onEnded, onToggleCinema, onToggleFullscreen, onMarkBad }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.loop = isLooping;
  }, [isLooping]);

  const readyRef = useRef(false);
  useEffect(() => {
    if (!readyRef.current) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 500);
    }
  }, [isPlaying]);

  useEffect(() => {
    readyRef.current = false;
    setLoadError(null);
  }, [video.id]);

  function handleLoadedData() {
    readyRef.current = true;
    const dur = videoRef.current?.duration;
    if (dur !== undefined && dur < 0.5) {
      setLoadError("File too short to play");
      return;
    }
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  }

  function handleError() {
    setLoadError("Unable to load video");
  }

  const updateProgress = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress(total ? (current / total) * 100 : 0);
    }
  }, []);

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    if (videoRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  }

  const displayName = video.name.replace(/\.[^/.]+$/, "");

  return (
    <div className="relative h-dvh w-full" style={{ background: "var(--video-canvas)" }}>
      {/* Video */}
      <video
        key={video.id}
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        className="h-full w-full object-contain"
        playsInline
        preload="metadata"
        onTimeUpdate={updateProgress}
        onLoadedMetadata={updateProgress}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={onEnded}
      />

      {/* Error overlay */}
      {loadError && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center animate-fade-in-up"
          style={{ background: "rgba(10, 10, 10, 0.94)" }}
        >
          <div
            className="w-12 h-12 flex items-center justify-center mb-4"
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "14px",
              background: "var(--bg-secondary)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--fg-secondary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <p style={{ fontSize: "15px", color: "var(--fg-primary)", marginBottom: "4px" }}>
            {loadError}
          </p>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
            {displayName}
          </p>
          {onMarkBad && (
            <button
              type="button"
              onClick={onMarkBad}
              className="btn-press mt-6 px-4 py-2.5"
              style={{
                ...monoStyle,
                border: "1px solid var(--border-default)",
                borderRadius: "10px",
                color: "var(--fg-secondary)",
                background: "var(--bg-secondary)",
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
              Skip and never show again
            </button>
          )}
        </div>
      )}

      {/* Buffering */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
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
        </div>
      )}

      {/* Play/Pause indicator */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{
          opacity: showPlayIcon ? 1 : 0,
          transform: showPlayIcon ? "scale(1)" : "scale(0.92)",
          transition: "opacity 150ms var(--ease-out), transform 300ms var(--ease-spring)",
        }}
      >
        <div
          className="w-16 h-16 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M7 4l13 8-13 8V4z" />
            </svg>
          )}
        </div>
      </div>

      {/* ===== NORMAL MODE ===== */}
      {!isCinemaMode && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ transition: "opacity 300ms var(--ease-out)" }}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)" }}
          >
            <span
              className="max-w-[60%] truncate"
              style={{ ...monoStyle, color: "rgba(255,255,255,0.55)" }}
            >
              {displayName}
            </span>
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={onToggleCinema}
                className="btn-press px-3 py-1.5"
                style={{
                  ...monoStyle,
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "rgba(255,255,255,0.55)",
                  background: "rgba(0,0,0,0.25)",
                  transition: "background-color 200ms var(--ease-out), border-color 200ms var(--ease-out), color 200ms var(--ease-out), transform 100ms var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                  e.currentTarget.style.background = "rgba(0,0,0,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  e.currentTarget.style.background = "rgba(0,0,0,0.25)";
                }}
              >
                Cinema
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="btn-press p-2"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "rgba(255,255,255,0.55)",
                  background: "rgba(0,0,0,0.25)",
                  transition: "background-color 200ms var(--ease-out), border-color 200ms var(--ease-out), color 200ms var(--ease-out), transform 100ms var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                  e.currentTarget.style.background = "rgba(0,0,0,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  e.currentTarget.style.background = "rgba(0,0,0,0.25)";
                }}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <div
              ref={progressRef}
              className="w-full cursor-pointer group"
              style={{ height: "4px", background: "rgba(255,255,255,0.12)" }}
              onClick={handleProgressClick}
            >
              <div
                className="h-full relative"
                style={{ width: `${progress}%`, background: "rgba(255,255,255,0.92)" }}
              >
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-opacity"
                  style={{ background: "white", opacity: 0, boxShadow: "0 0 8px rgba(0,0,0,0.4)" }}
                />
              </div>
            </div>
            <style>{`
              .group:hover > div > div:last-child { opacity: 1 !important; }
              .group:hover { height: 6px !important; }
              .group:hover > div { background: rgba(255,255,255,0.18) !important; }
            `}</style>
          </div>
        </div>
      )}

      {/* ===== CINEMA MODE ===== */}
      {isCinemaMode && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ transition: "opacity 300ms var(--ease-out)" }}
        >
          <div className="absolute top-5 right-5 z-30 flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleCinema}
              className="btn-press px-3 py-1.5"
              style={{
                ...monoStyle,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "rgba(255,255,255,0.55)",
                background: "rgba(0,0,0,0.25)",
                transition: "background-color 200ms var(--ease-out), border-color 200ms var(--ease-out), color 200ms var(--ease-out), transform 100ms var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                e.currentTarget.style.background = "rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                e.currentTarget.style.background = "rgba(0,0,0,0.25)";
              }}
            >
              Exit
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="btn-press p-2"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "rgba(255,255,255,0.55)",
                background: "rgba(0,0,0,0.25)",
                transition: "background-color 200ms var(--ease-out), border-color 200ms var(--ease-out), color 200ms var(--ease-out), transform 100ms var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                e.currentTarget.style.background = "rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                e.currentTarget.style.background = "rgba(0,0,0,0.25)";
              }}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-30">
            <div
              ref={progressRef}
              className="w-full cursor-pointer"
              style={{ height: "4px", background: "rgba(255,255,255,0.12)" }}
              onClick={handleProgressClick}
            >
              <div className="h-full" style={{ width: `${progress}%`, background: "rgba(255,255,255,0.92)" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
