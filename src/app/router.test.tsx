import { describe, expect, it } from 'vitest';
import { router } from './router';

describe('router', () => {
  it('認証済みユーザー向けにお問い合わせ画面のルートを提供する', () => {
    expect(flattenRoutes(router.routes).some((route) => route.path === 'contact-support')).toBe(true);
  });
});

function flattenRoutes(routes: typeof router.routes): typeof router.routes {
  return routes.flatMap((route) => [route, ...flattenRoutes(route.children ?? [])]);
}
