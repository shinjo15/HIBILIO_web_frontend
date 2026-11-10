import { describe, expect, it } from 'vitest';
import { router } from './router';

describe('router', () => {
  it('ホーム画面のルートを持つ', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'home')).toBe(true);
  });

  it('一覧専用のルートを持つ', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'feed')).toBe(true);
  });

  it('認証済みユーザー向けにお問い合わせ画面のルートを提供する', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'contact-support')).toBe(true);
  });

  it('認証済みユーザー向けに通知画面のルートを提供する', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'notifications')).toBe(true);
  });
});

function flattenRoutes(routes: typeof router.routes): typeof router.routes {
  return routes.flatMap((route) => [route, ...flattenRoutes(route.children ?? [])]);
}
