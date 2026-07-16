// src/services/driveImport.ts

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
};

const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY as string;

/**
 * Accepts a raw folder ID or any common Drive folder URL shape and
 * returns just the folder ID.
 *   https://drive.google.com/drive/folders/<ID>?usp=sharing
 *   https://drive.google.com/drive/u/0/folders/<ID>
 */
export function extractFolderId(input: string): string {
  const trimmed = input.trim();

  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // already looks like a bare ID
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  throw new Error("Could not read a folder ID from that link.");
}

/**
 * Maps a Drive mimeType to your Material type union.
 */
export function mimeTypeToMaterialType(mimeType: string): "pdf" | "video" | "image" | "note" | "link" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType === "application/vnd.google-apps.document" ||
    mimeType === "text/plain" ||
    mimeType.includes("word")
  )
    return "note";
  return "link";
}

/**
 * Lists all files directly inside a Drive folder (handles pagination).
 * Requires the folder to be shared "Anyone with the link".
 */
export async function listDriveFolderFiles(folderInput: string): Promise<DriveFile[]> {
  if (!API_KEY) {
    throw new Error("Missing VITE_GOOGLE_DRIVE_API_KEY in your environment.");
  }

  const folderId = extractFolderId(folderInput);
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      key: API_KEY,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink)",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });

    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      const message = data?.error?.message || "Failed to read Drive folder.";
      throw new Error(
        message.includes("not found")
          ? "Folder not found or not shared publicly. Set sharing to 'Anyone with the link'."
          : message
      );
    }

    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Drive folders can contain sub-folders — skip those, we only want files
  return files.filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
}

/**
 * Turns a filename into a clean title by stripping the extension.
 */
export function fileNameToTitle(name: string): string {
  return name.replace(/\.[a-zA-Z0-9]{2,5}$/, "").trim();
}
