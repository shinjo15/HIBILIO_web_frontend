import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/login/pages/LoginPage';
import { RegisterPage } from '../features/auth/register/pages/RegisterPage';
import { AccountPage } from '../features/account/pages/AccountPage';
import { RoutineFeedPage } from '../features/routineFeed/pages/RoutineFeedPage';
import { CreateRoutinePage } from '../features/routinePost/pages/CreateRoutinePage';
import { RoutineDetailPage } from '../features/routineDetail/pages/RoutineDetailPage';
import { AppShell } from '../shared/navigation/AppShell';

export const router = createBrowserRouter([
  {
    element: <LoginPage />,
    path: 'login',
  },
  {
    element: <RegisterPage />,
    path: 'sign-up',
  },
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
      {
        element: <RoutineDetailPage />,
        path: 'routines/:routineId',
      },
    ],
  },
]);
