export function isConnectivityError(e: unknown) {
  const code = (e as { code?: string } | null)?.code;
  const msg = e instanceof Error ? e.message : "";
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EPIPE|getaddrinfo|terminat|Connection terminated|Can't reach database server|DatabaseNotReachable/i.test(msg)
  );
}

const BACKOFFS_MS = [150, 300, 600, 1000, 1500];

export async function withDbRetry<T>(
  label: string,
  attempt: () => Promise<T>,
  onConnectivityFailure?: () => void
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= BACKOFFS_MS.length; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (!isConnectivityError(err)) throw err;
      onConnectivityFailure?.();
      if (i === BACKOFFS_MS.length) break;
      const wait = BACKOFFS_MS[i];
      console.warn(
        `[${label}] connectivity error (attempt ${i + 1}/${BACKOFFS_MS.length + 1}), retrying in ${wait}ms:`,
        (err as Error).message
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
