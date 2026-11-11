import { describe, expect, it } from 'vitest';
import { getRoutineVideoPresentation, isHttpVideoUrl } from './routineVideo';

describe('routineVideo', () => {
  it('HTTP(S) URL だけを動画リンクとして受け入れる', () => {
    expect(isHttpVideoUrl('https://example.com/video')).toBe(true);
    expect(isHttpVideoUrl('http://127.1/video')).toBe(true);
    expect(isHttpVideoUrl('https://例え.テスト/動画?q=日本語')).toBe(true);
    expect(isHttpVideoUrl('https://example.com/video?q=%E6%97%A5%E6%9C%AC%E8%AA%9E')).toBe(true);
    expect(isHttpVideoUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpVideoUrl('data:text/html,alert(1)')).toBe(false);
    expect(isHttpVideoUrl('mailto:test@example.com')).toBe(false);
    expect(isHttpVideoUrl('https://example.com/ video')).toBe(false);
    expect(isHttpVideoUrl('https://example.com/%')).toBe(false);
    expect(isHttpVideoUrl('https://example.com/%zz')).toBe(false);
    expect(isHttpVideoUrl('https://1.2.3.08/video')).toBe(false);
    expect(isHttpVideoUrl('')).toBe(false);
  });

  it('YouTube の再生URLから固定の安全なサムネイルURLを生成する', () => {
    expect(getRoutineVideoPresentation('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
    expect(getRoutineVideoPresentation('https://youtu.be/dQw4w9WgXcQ?t=42')).toEqual({
      kind: 'youtube',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  });

  it('YouTube以外と識別子が不正なURLは代替表示にする', () => {
    expect(getRoutineVideoPresentation('https://example.com/video')).toEqual({ kind: 'fallback' });
    expect(getRoutineVideoPresentation('https://youtube.com/watch?v=not-an-id')).toEqual({ kind: 'fallback' });
  });
});
