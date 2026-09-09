import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useLayoutEffect } from 'react';

const scrollPositions = new Map<string, number>();

export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    if (navigationType === 'POP') {
      window.scrollTo({ left: 0, top: scrollPositions.get(location.key) ?? 0 });
    } else {
      window.scrollTo({ left: 0, top: 0 });
    }

    return () => {
      scrollPositions.set(location.key, window.scrollY);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [location.key, navigationType]);

  return <Outlet />;
}
