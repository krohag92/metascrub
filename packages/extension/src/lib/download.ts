/**
 * Trigger a file download in the browser via chrome.downloads.download.
 * Creates a temporary blob: URL, initiates the download, then revokes the URL.
 */
export async function downloadBytes(bytes: Uint8Array, filename: string): Promise<void> {
  // Copy into a fresh ArrayBuffer to guarantee compatibility with Blob constructor
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy]);
  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: blobUrl,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        URL.revokeObjectURL(blobUrl);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (downloadId === undefined) {
          reject(new Error('Download failed: no download ID returned'));
        } else {
          resolve();
        }
      },
    );
  });
}
