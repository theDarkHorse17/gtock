const SAVED_FOLDERS_KEY = "gtock_saved_folders";
const LAST_USED_FOLDERS_KEY = "gtock_last_used_folders";

export interface SavedFolder {
  id: string;
  name: string;
  urls: string[];
  createdAt: number;
}

export function getSavedFolders(): SavedFolder[] {
  try {
    const stored = localStorage.getItem(SAVED_FOLDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveFolder(name: string, urls: string[]): SavedFolder {
  const folders = getSavedFolders();
  const newFolder: SavedFolder = {
    id: Date.now().toString(),
    name,
    urls: urls.filter((u) => u.trim()),
    createdAt: Date.now(),
  };
  folders.push(newFolder);
  localStorage.setItem(SAVED_FOLDERS_KEY, JSON.stringify(folders));
  return newFolder;
}

export function deleteSavedFolder(id: string): void {
  const folders = getSavedFolders().filter((f) => f.id !== id);
  localStorage.setItem(SAVED_FOLDERS_KEY, JSON.stringify(folders));
}

export function getLastUsedFolders(): string[] {
  try {
    const stored = localStorage.getItem(LAST_USED_FOLDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveLastUsedFolders(urls: string[]): void {
  const filtered = urls.filter((u) => u.trim());
  if (filtered.length > 0) {
    localStorage.setItem(LAST_USED_FOLDERS_KEY, JSON.stringify(filtered));
  }
}
