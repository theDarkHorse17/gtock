// gtock - CORS Proxy + Google Drive API

const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem) {
  const fixed = pem.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const b64 = fixed
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "")
    .replace(/\s/g, "")
    .trim();
  const binaryDer = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function createJWT(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const message = `${header}.${payload}`;
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(message));
  return `${message}.${base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function getAccessToken(sa) {
  const jwt = await createJWT(sa);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  return res.json();
}

async function listVideos(token, folderId) {
  const q = `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`;
  const fields = "nextPageToken,files(id,name,mimeType,size,createdTime)";
  let allFiles = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({
      q,
      fields,
      pageSize: "1000",
      access_token: token,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const url = `${GOOGLE_DRIVE_API}/files?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) return data;

    allFiles = allFiles.concat(data.files || []);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return { files: allFiles };
}

async function getFolderName(token, folderId) {
  const params = new URLSearchParams({
    fields: "name",
    access_token: token,
  });
  const url = `${GOOGLE_DRIVE_API}/files/${folderId}?${params.toString()}`;
  const res = await fetch(url);
  return res.json();
}

async function streamVideo(token, fileId, request) {
  const url = `${GOOGLE_DRIVE_API}/files/${fileId}?alt=media`;
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
  });

  const range = request.headers.get("Range");
  if (range) {
    headers.set("Range", range);
  }

  const res = await fetch(url, { headers });
  const responseHeaders = new Headers(res.headers);
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "*");
  responseHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");
  responseHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  responseHeaders.set("Accept-Ranges", "bytes");

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*" },
      });
    }

    const url = new URL(request.url);
    const folderId = url.searchParams.get("folderId");
    const fileId = url.searchParams.get("fileId");
    const folderName = url.searchParams.get("folderName") === "true";

    if (!folderId && !fileId) return json({ error: "Missing folderId or fileId" }, 400);

    if (!env.SERVICE_ACCOUNT) return json({ error: "SERVICE_ACCOUNT not configured" }, 500);

    try {
      const sa = JSON.parse(env.SERVICE_ACCOUNT);
      const tokenRes = await getAccessToken(sa);
      if (tokenRes.error) return json({ error: "Token failed", details: tokenRes }, 500);

      if (fileId) {
        return await streamVideo(tokenRes.access_token, fileId, request);
      }

      if (folderName) {
        const result = await getFolderName(tokenRes.access_token, folderId);
        return json(result);
      }

      const result = await listVideos(tokenRes.access_token, folderId);
      return json(result);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Unexpected worker error" }, 500);
    }
  },
};
