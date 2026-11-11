/**
 * Deadline for optional server-rendered home-page widgets.
 * This never changes authentication or authorization; it only stops a
 * noncritical widget holding a streamed page when Supabase is unreachable.
 * The caller handles timeout by rendering its existing empty-state.
 */
export async function withQueryDeadline<T>(task: Promise<T>, ms = 4_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Home widget query deadline exceeded')), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
