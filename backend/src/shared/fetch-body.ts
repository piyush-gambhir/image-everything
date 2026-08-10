export class ResponseBodyTooLargeError extends Error {
  constructor(public readonly maximumBytes: number) {
    super(`Response body exceeds ${maximumBytes} bytes`);
    this.name = "ResponseBodyTooLargeError";
  }
}

export async function readResponseBytes(
  response: Response,
  maximumBytes: number,
): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    await response.body?.cancel();
    throw new ResponseBodyTooLargeError(maximumBytes);
  }

  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let bytes = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        throw new ResponseBodyTooLargeError(maximumBytes);
      }
      chunks.push(Buffer.from(item.value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, bytes);
}
