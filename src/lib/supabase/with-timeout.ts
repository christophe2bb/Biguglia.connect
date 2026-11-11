export class AuthTimeoutError extends Error {
  constructor() {
    super('Le service de connexion ne répond pas. Réessayez dans quelques instants.');
    this.name = 'AuthTimeoutError';
  }
}

/** Bound SDK calls even when they are waiting for a session lock or a network retry. */
export async function withAuthTimeout<T>(
  operation: () => T,
  timeoutMs = 10_000,
): Promise<Awaited<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AuthTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
