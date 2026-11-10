import { afterEach, describe, expect, it, vi } from 'vitest';
import { enqueueAccountMutation, resetAccountMutationQueueForTesting } from './accountMutationQueue';

afterEach(() => resetAccountMutationQueueForTesting());

describe('enqueueAccountMutation', () => {
  it('同一セッションのアカウント更新を前の更新完了後に開始する', async () => {
    const calls: string[] = [];
    let resolveFirst: () => void = () => undefined;
    const first = enqueueAccountMutation(() => new Promise<void>((resolve) => {
      calls.push('like');
      resolveFirst = resolve;
    }));
    const second = enqueueAccountMutation(async () => {
      calls.push('support');
    });

    await vi.waitFor(() => expect(calls).toEqual(['like']));

    resolveFirst();
    await Promise.all([first, second]);
    expect(calls).toEqual(['like', 'support']);
  });

  it('失敗した更新の後も後続更新を開始する', async () => {
    const calls: string[] = [];
    await expect(enqueueAccountMutation(async () => {
      calls.push('visibility');
      throw new Error('network');
    })).rejects.toThrow('network');

    await enqueueAccountMutation(async () => {
      calls.push('ui-mode');
    });
    expect(calls).toEqual(['visibility', 'ui-mode']);
  });
});
