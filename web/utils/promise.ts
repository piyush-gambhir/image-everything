export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Timeout') {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delayMs?: number; factor?: number } = {},
): Promise<T> {
  const { retries = 3, delayMs = 250, factor = 2 } = options;
  let attempt = 0;
  let currentDelay = delayMs;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      await sleep(currentDelay);
      currentDelay *= factor;
    }
  }
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
