import { useState } from "react";
import { readLiked } from "./Feed";

interface LikedPageProps {
  onBack: () => void;
  onPlay: (folderId: string, videoId: string) => void;
}

const VIEW_KEY = "gtock:liked-view";

function getInitialView(): "list" | "grid" {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "grid") return "grid";
  } catch {}
  return "list";
}

const monoStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const buttonStyle = {
  ...monoStyle,
  padding: "10px 12px",
  border: "1px solid var(--border-default)",
  color: "var(--fg-muted)",
  background: "transparent",
  transition: "background-color 150ms var(--ease-out), border-color 150ms var(--ease-out), color 150ms var(--ease-out), transform 100ms var(--ease-out)",
};

export function LikedPage({ onBack, onPlay }: LikedPageProps) {
  const liked = readLiked();
  const [view, setView] = useState<"list" | "grid">(getInitialView);
  const [viewKey, setViewKey] = useState(0);

  function toggleView() {
    const next = view === "list" ? "grid" : "list";
    setView(next);
    setViewKey((k) => k + 1);
    try { localStorage.setItem(VIEW_KEY, next); } catch {}
  }

  return (
    <div
      className="min-h-dvh"
      style={{
        background: "var(--bg-primary)",
        color: "var(--fg-primary)",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 flex items-center gap-0"
        style={{
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-subtle)",
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="btn-press"
          style={{
            ...buttonStyle,
            borderTopLeftRadius: "10px",
            borderBottomLeftRadius: "10px",
            borderRight: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-muted)")}
        >
          ← Back
        </button>
        <div
          className="flex-1 text-center"
          style={{
            ...buttonStyle,
            borderRight: "none",
            color: "var(--fg-primary)",
          }}
        >
          Liked Archive
        </div>
        <div
          style={{
            ...buttonStyle,
            borderRight: "none",
          }}
        >
          {String(liked.length).padStart(3, "0")}
        </div>
        {liked.length > 0 && (
          <button
            type="button"
            onClick={toggleView}
            className="btn-press"
            style={{
              ...buttonStyle,
              borderTopRightRadius: "10px",
              borderBottomRightRadius: "10px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-muted)")}
          >
            {view === "list" ? "Grid" : "List"}
          </button>
        )}
      </div>

      {/* Content */}
      {liked.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-5 animate-fade-in-scale"
        >
          <div
            className="w-14 h-14 flex items-center justify-center"
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "16px",
              background: "var(--bg-secondary)",
            }}
          >
            <span style={{ color: "var(--fg-muted)", fontSize: "22px" }}>♥</span>
          </div>
          <p style={{ ...monoStyle, color: "var(--fg-muted)" }}>Archive Empty</p>
          <p style={{ ...monoStyle, fontSize: "9px", color: "var(--fg-subtle)", maxWidth: "220px" }}>
            Mark videos with ♥ during playback to save them here
          </p>
        </div>
      ) : view === "list" ? (
        <div key={`list-${viewKey}`} style={{ padding: "16px" }}>
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              overflow: "hidden",
              background: "var(--bg-secondary)",
            }}
          >
            {liked.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onPlay(v.folderId, v.id)}
                className={`stagger-item stagger-${Math.min(i + 1, 10)} w-full flex items-center gap-0 text-left card-hover`}
                style={{
                  background: "transparent",
                  borderBottom: i < liked.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <span
                  className="flex-shrink-0 text-center"
                  style={{
                    ...monoStyle,
                    color: "var(--fg-subtle)",
                    width: "52px",
                    padding: "14px 0",
                    borderRight: "1px solid var(--border-subtle)",
                  }}
                >
                  {String(i + 1).padStart(3, "0")}
                </span>
                <div
                  className="w-14 h-14 flex-shrink-0 overflow-hidden"
                  style={{
                    background: "var(--bg-tertiary)",
                    borderRight: "1px solid var(--border-subtle)",
                  }}
                >
                  <img
                    src={`https://drive.google.com/thumbnail?id=${v.id}&sz=w200`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="flex-1 px-3.5 py-3 min-w-0">
                  <p
                    style={{
                      ...monoStyle,
                      color: "var(--fg-primary)",
                      fontSize: "11px",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {v.name.replace(/\.[^/.]+$/, "").toUpperCase()}
                  </p>
                  <p
                    style={{
                      ...monoStyle,
                      fontSize: "9px",
                      color: "var(--fg-subtle)",
                      marginTop: "4px",
                    }}
                  >
                    ID: {v.id.slice(0, 16)}...
                  </p>
                </div>
                <span
                  className="flex-shrink-0 px-4"
                  style={{
                    ...monoStyle,
                    color: "var(--fg-subtle)",
                    borderLeft: "1px solid var(--border-subtle)",
                  }}
                >
                  ▶
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div key={`grid-${viewKey}`} className="grid grid-cols-2" style={{ padding: "16px", gap: "12px" }}>
          {liked.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onPlay(v.folderId, v.id)}
              className={`stagger-item stagger-${Math.min(i + 1, 10)} flex flex-col text-left card-hover`}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <div
                className="w-full aspect-video overflow-hidden"
                style={{ background: "var(--bg-tertiary)" }}
              >
                <img
                  src={`https://drive.google.com/thumbnail?id=${v.id}&sz=w400`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="p-3.5">
                <p
                  style={{
                    ...monoStyle,
                    color: "var(--fg-primary)",
                    fontSize: "10px",
                    letterSpacing: "0.03em",
                  }}
                >
                  {v.name.replace(/\.[^/.]+$/, "").toUpperCase()}
                </p>
                <p
                  style={{
                    ...monoStyle,
                    fontSize: "8px",
                    color: "var(--fg-subtle)",
                    marginTop: "4px",
                  }}
                >
                  {v.id.slice(0, 12)}...
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
