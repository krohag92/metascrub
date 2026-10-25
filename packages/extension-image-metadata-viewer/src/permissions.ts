export async function resolveHostAccess(
  contains: () => Promise<boolean>,
  request: () => Promise<boolean>,
): Promise<boolean> {
  if (await contains()) return true;
  try {
    return await request();
  } catch {
    return false;
  }
}

export const HOST_PERMISSION_MESSAGE =
  'The extension needs permission to read images on this site. Allow access, then right-click the image again.';
