export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.retries ?? 2;
  const baseMs = options.baseMs ?? 0;

  let attempt = 0;
  // First try + retries
  // Attempts are 0..maxRetries inclusive in terms of tries
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      options.onRetry && options.onRetry(attempt + 1, err);
      const delay = baseMs > 0 ? baseMs * Math.pow(2, attempt) : 0;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}

export default retry;

