import type { Context } from 'hono';

type FileReadSuccess = { data: Uint8Array; filename: string | undefined };
type FileReadError = { error: string; status: 400 | 413 | 415 };

/**
 * Read a single file field from a multipart/form-data request.
 * Returns a union of success or error so callers can return early without
 * throwing.
 */
export async function readMultipartFile(
  c: Context,
  fieldName: string,
  maxBytes: number,
): Promise<FileReadSuccess | FileReadError> {
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return { error: 'Expected multipart/form-data body', status: 400 };
  }

  const entry = form.get(fieldName);
  if (!(entry instanceof File)) {
    return { error: `Missing required file field "${fieldName}"`, status: 400 };
  }

  if (entry.size > maxBytes) {
    return {
      error: `File exceeds maximum allowed size of ${maxBytes} bytes`,
      status: 413,
    };
  }

  const buffer = await entry.arrayBuffer();
  return {
    data: new Uint8Array(buffer),
    filename: entry.name || undefined,
  };
}
