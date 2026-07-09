# gtock

> TikTok-style video feed for Google Drive folders. 100% free, zero backend.

---

## Overview

gtock lets you paste a Google Drive folder link and watch all videos in a TikTok-style vertical scroll feed.

**For normal users:** Paste link → watch videos. That's it.

**For you (app owner):** Set up service account once, then it works for everyone.

---

## For App Owner (One-Time Setup)

1. Create a Google Cloud project
2. Create a service account
3. Download the JSON key
4. Deploy Cloudflare Worker with the key
5. Done - normal users can now paste any public folder link

---

## For Normal Users

1. Go to the app
2. Paste a Google Drive folder link
3. Click "Load"
4. Watch videos in TikTok-style feed
5. Scroll to next video

**That's it. No login. No setup. Just paste and watch.**

---

## Cost: $0

| Service | Free Tier | Sufficient? |
|---------|-----------|-------------|
| Google Drive API | 400M quota units/day | Yes |
| Cloudflare Workers | 100K requests/day | Yes |
| Vercel | 100GB bandwidth/month | Yes |
| GitHub | Unlimited repos | Yes |

---

## Tech Stack

| Layer | Tool | Version |
|-------|------|---------|
| Framework | React | 19.x |
| Build | Vite | 8.x |
| Styling | TailwindCSS | 4.x |
| Language | TypeScript | 5.x |
| Data Fetching | TanStack Query | 5.x |
| Video | HTML5 `<video>` | Native |
| API | Google Drive API v3 | - |
| Deploy | Vercel | - |
| CORS Proxy | Cloudflare Worker | Free |

---

## Architecture

```
┌──────────┐     ┌─────────────────┐     ┌────────────────┐
│  User    │────▶│  gtock UI       │────▶│  CF Worker     │
│  Browser │     │  (React/Vite)   │     │  (CORS Proxy)  │
└──────────┘     └─────────────────┘     └────────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │ Google Drive  │
                                          │ API v3        │
                                          └───────────────┘
```

### Folder Parsing

User pastes:
```
https://drive.google.com/drive/folders/xxxxxxxx
```

Extract folder ID:
```typescript
const folderId = url.match(/folders\/([^?]+)/)?.[1];
```

### Google Drive API (Free Tier)

Use `files.list` with query:
```
'<folderId>' in parents and mimeType contains 'video/'
```

Return types:
- `video/mp4`
- `video/mov`
- `video/mkv`
- `video/webm`

**Rate limit:** 400M quota units/day (1 unit per files.list call)

### CORS Proxy + Service Account Authentication

Google Drive API blocks browser requests. Cloudflare Worker solves this by:
1. Authenticating with Google Drive API using a service account
2. Listing videos in the folder
3. Returning the results to the frontend

**Service Account Setup:**

1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Store it as a Cloudflare Worker secret:
   ```bash
   # Install wrangler
   npm install -g wrangler

   # Login to Cloudflare
   wrangler login

   # Store the service account JSON as a secret
   cat your-service-account.json | wrangler secret put SERVICE_ACCOUNT
   ```

4. Share your Google Drive folders with the service account email:
   ```
   gtock-api@gtock-501911.iam.gserviceaccount.com
   ```

**Worker Code:**

```javascript
// worker/index.js
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function importPrivateKey(pem) {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function createJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const message = `${headerB64}.${payloadB64}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(message));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${message}.${signatureB64}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = await createJWT(serviceAccount);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await response.json();
  return data.access_token;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const folderId = url.searchParams.get("folderId");
    if (!folderId) {
      return new Response("Missing folderId parameter", { status: 400 });
    }

    try {
      const serviceAccount = JSON.parse(SERVICE_ACCOUNT);
      const accessToken = await getAccessToken(serviceAccount);

      const query = `'${folderId}' in parents and (mimeType='video/mp4' or mimeType='video/mov' or mimeType='video/mkv' or mimeType='video/webm')`;
      const driveUrl = `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime)&access_token=${accessToken}`;

      const response = await fetch(driveUrl);
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
```

**Deploy:**
```bash
wrangler deploy
```

### Video Streaming

Each file becomes:
```
https://drive.google.com/uc?id=FILE_ID
```

or:
```
https://drive.google.com/file/d/FILE_ID/preview
```

Use whichever streams more reliably.

---

## Features

### MVP

| # | Feature | Status |
|---|---------|--------|
| 1 | Paste folder URL | Required |
| 2 | Load video list from Drive API | Required |
| 3 | TikTok-style vertical scroll feed | Required |
| 4 | Keyboard navigation | Required |
| 5 | Dark theme | Required |
| 6 | Video info overlay | Required |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause/Play |
| `↓` | Next video |
| `↑` | Previous video |
| `F` | Favorite |
| `K` | Keep |
| `X` | Reject |
| `M` | Mute |
| `L` | Loop |

### Phase 2 (Post-MVP)

- Collections (⭐ Hero, ❤️ Keep, 🗑 Reject)
- Search/filter videos
- Resume position (localStorage)
- Multi-folder support
- Export collections

---

## Step-by-Step Build Guide

### Step 1: Project Setup

```bash
# Create project
npm create vite@latest gtock -- --template react-ts
cd gtock
npm install

# Install dependencies
npm install -D tailwindcss @tailwindcss/vite
npm install @tanstack/react-query

# Start dev server
npm run dev
```

### Step 2: TailwindCSS v4 Config

In `vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

In `src/index.css`:
```css
@import "tailwindcss";
```

### Step 3: Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project (name: `gtock`)
3. **No billing required**
4. Go to **APIs & Services** → **Library**
5. Search "Google Drive API" → Enable
6. Go to **IAM & Admin** → **Service Accounts**
7. Click **Create Service Account**
8. Name: `gtock-api`
9. Click **Create and Continue**
10. **Skip** the "Grant this service account access" step
11. Click **Done**
12. Click on the service account you just created
13. Go to **Keys** tab
14. Click **Add Key** → **Create new key**
15. Select **JSON** → **Create**
16. Save the JSON file (you'll need this for the worker)

**Service Account Email:**
```
gtock-api@gtock-501911.iam.gserviceaccount.com
```

**Important:** For the service account to access a folder, the folder must be shared as:
- **"Anyone with the link can view"** (recommended for public content)
- OR share directly with the service account email

Most Google Drive folders are already shared this way, so normal users can just paste their link and it works.

### Step 4: Environment Variables

Create `.env`:
```
VITE_CORS_PROXY=https://gtock-cors.your-subdomain.workers.dev
```

**Note:** The service account credentials are stored securely in the Cloudflare Worker as a secret, not in the frontend code.

### Step 5: Build Components

#### `src/types/Video.ts`
```typescript
export interface Video {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  videoUrl: string;
  thumbnailUrl?: string;
}
```

#### `src/utils/parser.ts`
```typescript
export function extractFolderId(url: string): string | null {
  const match = url.match(/folders\/([^?]+)/);
  return match ? match[1] : null;
}
```

#### `src/utils/drive.ts`
```typescript
import type { Video } from "../types/Video";

const CORS_PROXY = import.meta.env.VITE_CORS_PROXY;

export async function listVideos(folderId: string): Promise<Video[]> {
  const url = `${CORS_PROXY}?folderId=${folderId}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdTime: file.createdTime,
    videoUrl: `https://drive.google.com/uc?id=${file.id}`,
  }));
}
```

#### `src/hooks/useDrive.ts`
```typescript
import { useQuery } from "@tanstack/react-query";
import { listVideos } from "../utils/drive";

export function useDriveVideos(folderId: string | null) {
  return useQuery({
    queryKey: ["videos", folderId],
    queryFn: () => listVideos(folderId!),
    enabled: !!folderId,
  });
}
```

#### `src/components/VideoPlayer.tsx`
```typescript
import { Video } from "../types/Video";

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
}

export function VideoPlayer({ video, isActive }: VideoPlayerProps) {
  return (
    <div className="relative h-screen w-full bg-black flex items-center justify-center">
      <video
        src={video.videoUrl}
        className="h-full w-full object-contain"
        autoPlay={isActive}
        loop
        muted={false}
        controls={false}
      />
      <div className="absolute bottom-4 left-4 text-white">
        <p className="text-lg font-bold">{video.name}</p>
        <p className="text-sm opacity-75">
          {new Date(video.createdTime).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
```

#### `src/components/Feed.tsx`
```typescript
import { useState, useEffect } from "react";
import { Video } from "../types/Video";
import { VideoPlayer } from "./VideoPlayer";

interface FeedProps {
  videos: Video[];
}

export function Feed({ videos }: FeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          setCurrentIndex((i) => Math.min(i + 1, videos.length - 1));
          break;
        case "ArrowUp":
          setCurrentIndex((i) => Math.max(i - 1, 0));
          break;
        case " ":
          e.preventDefault();
          // Toggle play/pause
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videos.length]);

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        No videos found
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-black">
      <VideoPlayer
        video={videos[currentIndex]}
        isActive={true}
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-sm">
        {currentIndex + 1} / {videos.length}
      </div>
    </div>
  );
}
```

#### `src/App.tsx`
```typescript
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { extractFolderId } from "./utils/parser";
import { useDriveVideos } from "./hooks/useDrive";
import { Feed } from "./components/Feed";

const queryClient = new QueryClient();

function AppContent() {
  const [folderUrl, setFolderUrl] = useState("");
  const folderId = extractFolderId(folderUrl);
  const { data: videos, isLoading } = useDriveVideos(folderId);

  return (
    <div className="min-h-screen bg-black text-white">
      {!folderId ? (
        <div className="h-screen flex flex-col items-center justify-center gap-4">
          <h1 className="text-4xl font-bold">gtock</h1>
          <p className="text-gray-400">
            TikTok-style feed for Google Drive folders
          </p>
          <input
            type="text"
            placeholder="Paste Google Drive folder URL..."
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            className="w-96 px-4 py-2 rounded bg-gray-800 border border-gray-600"
          />
        </div>
      ) : isLoading ? (
        <div className="h-screen flex items-center justify-center">
          <div className="text-xl">Loading videos...</div>
        </div>
      ) : (
        <Feed videos={videos || []} />
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
```

### Step 6: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Project Structure

```
gtock/
├── src/
│   ├── components/
│   │   ├── Feed.tsx
│   │   └── VideoPlayer.tsx
│   ├── hooks/
│   │   └── useDrive.ts
│   ├── types/
│   │   └── Video.ts
│   ├── utils/
│   │   ├── drive.ts
│   │   └── parser.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── worker/
│   └── index.js
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.toml
└── .env
```

---

## Key Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| CORS blocked by Google | Cloudflare Worker proxy |
| API quotas | Cache results, limit requests |
| Video streaming | Use Google Drive preview URLs |
| Auth required | API key for public folders only |
| No backend | All logic runs client-side |
| State management | useState + URL hash |

---

## Testing the MVP

1. Find a public Google Drive folder with videos
2. Paste the URL into gtock
3. Verify videos load
4. Test scroll navigation
5. Test keyboard shortcuts
6. Deploy to Vercel
7. Share the link

---

## Future Enhancements (Not MVP)

- AI auto-tagging (OpenAI Vision API)
- Export collections to CSV
- Share playlists
- Mobile touch gestures
- Offline caching (Service Worker)
