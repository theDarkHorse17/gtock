# gtock Work Log

Append-only task log for the gtock project.

| # | Name | Date | Description | Status | Folders |
|---|------|------|-------------|--------|---------|
| 1 | Saved folders + localStorage persistence | 2026-07-09 | Added localStorage persistence for last-used folder URLs and a "Saved Folders" feature with save/delete UI on the home screen | Completed | `gtock-app/src/utils/storage.ts`, `gtock-app/src/App.tsx` |
| 2 | Dark minimalist UI remodel | 2026-07-09 | Remodeled the entire UI to a dark minimalist aesthetic using Emil Kowalski design-engineering principles: custom easing curves, scale(0.97) press feedback, refined spacing/padding, glassmorphism video controls, larger touch targets, improved progress bar, and consistent design tokens | Completed | `gtock-app/src/index.css`, `gtock-app/src/App.tsx`, `gtock-app/src/components/Feed.tsx`, `gtock-app/src/components/VideoPlayer.tsx`, `gtock-app/src/components/LikedPage.tsx` |
| 3 | Fullscreen playback option | 2026-07-09 | Added fullscreen toggle to the video player with a top-bar button, keyboard shortcut (`F`), and fullscreenchange event sync | Completed | `gtock-app/src/components/Feed.tsx`, `gtock-app/src/components/VideoPlayer.tsx` |
| 4 | Landing page spacing | 2026-07-09 | Increased vertical spacing between landing-page items: main wrapper, logo, inputs, save section, and saved folders; switched landing layout to `justify-between` so logo, inputs, and features distribute across the viewport | Completed | `gtock-app/src/App.tsx` |
| 5 | Fix fullscreen init error | 2026-07-09 | Moved `toggleFullscreen` definition before the keyboard useEffect in Feed.tsx to fix `Cannot access before initialization` runtime error | Completed | `gtock-app/src/components/Feed.tsx` |
| 6 | Landing page layout + saved folder names | 2026-07-09 | Increased center spacing/padding on landing page, added top spacing to logo, moved Liked button below save sequence, made saved-folder delete always visible, auto-fetch Drive folder names when saving, hide like/mute/loop buttons in fullscreen | Completed | `gtock-app/src/App.tsx`, `gtock-app/src/components/Feed.tsx`, `gtock-app/src/utils/drive.ts`, `gtock-app/worker/index.js` |
| 7 | Deploy to GitHub + Vercel + Cloudflare | 2026-07-09 | Created GitHub repo `gtock`, pushed code, deployed updated Cloudflare worker `gtock-cors`, deployed frontend to Vercel with `VITE_CORS_PROXY` env var | Completed | GitHub, Vercel, Cloudflare Workers |
