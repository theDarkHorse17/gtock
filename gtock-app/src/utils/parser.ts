export function extractFolderId(url: string): string | null {
  const value = url.trim();

  if (!value) {
    return null;
  }

  const directMatch = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  const queryMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return value;
  }

  return null;
}

export function extractFolderIds(input: string): string[] {
  const lines = input.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const id = extractFolderId(line);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return ids;
}
