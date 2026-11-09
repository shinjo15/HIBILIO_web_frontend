let tail: Promise<void> | null = null;

/**
 * The account backend restores an Account and saves all of its fields for each
 * setting endpoint. Serialize same-session mutations so independent controls
 * cannot write stale snapshots over one another.
 */
export function enqueueAccountMutation<T>(operation: () => Promise<T>): Promise<T> {
  const previous = tail ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  const nextTail = current.then(() => undefined, () => undefined);
  tail = nextTail;
  void nextTail.finally(() => {
    if (tail === nextTail) tail = null;
  });

  return current;
}

export function resetAccountMutationQueueForTesting(): void {
  tail = null;
}
