import { createBrowserRouter } from 'react-router-dom';
import { AccountPage } from '../features/account/pages/AccountPage';
import { RoutineFeedPage } from '../features/routineFeed/pages/RoutineFeedPage';
import { CreateRoutinePage } from '../features/routinePost/pages/CreateRoutinePage';
import { AppShell } from '../shared/navigation/AppShell';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        element: <RoutineFeedPage />,
        index: true,
      },
      {
        element: <AccountPage />,
        path: 'account',
      },
      {
        element: <CreateRoutinePage />,
        path: 'routines/new',
      },
    ],
  },
]);
