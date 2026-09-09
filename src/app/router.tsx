import { createBrowserRouter } from 'react-router-dom';
import { RequireAuthentication } from '../features/auth/components/RequireAuthentication';
import { LoginPage } from '../features/auth/login/pages/LoginPage';
import { RegisterPage } from '../features/auth/register/pages/RegisterPage';
import { AccountPage } from '../features/account/pages/AccountPage';
import { ProfileEditPage } from '../features/account/pages/ProfileEditPage';
import { AccountExecutionHistoryPage } from '../features/account/pages/AccountExecutionHistoryPage';
import { PublicAccountPage } from '../features/account/pages/PublicAccountPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { RoutineFeedPage } from '../features/routineFeed/pages/RoutineFeedPage';
import { RoutineCreatePage } from '../features/routineCreate/pages/RoutineCreatePage';
import { CustomizedRoutineCreatePage } from '../features/routineCreate/pages/CustomizedRoutineCreatePage';
import { RoutineDetailPage } from '../features/routineDetail/pages/RoutineDetailPage';
import { RoutineExecutionPage } from '../features/routineExecution/pages/RoutineExecutionPage';
import { AppShell } from '../shared/navigation/AppShell';
import { ScrollManager } from './ScrollManager';

export const router = createBrowserRouter([
  {
    element: <ScrollManager />,
    children: [
      {
        element: <LoginPage />,
        path: 'login',
      },
      {
        element: <RegisterPage />,
        path: 'sign-up',
      },
      {
        element: <RequireAuthentication />,
        children: [
          { element: <AccountExecutionHistoryPage />, path: 'routines/:routineId/executions/:executionId' },
          { element: <RoutineExecutionPage />, path: 'routines/:routineId/execute' },
        ],
      },
      {
        element: <AppShell />,
        children: [
          { element: <RoutineFeedPage />, index: true },
          {
            element: <RequireAuthentication />,
            children: [
              { element: <AccountPage />, path: 'account' },
              { element: <ProfileEditPage />, path: 'account/edit' },
              { element: <SettingsPage />, path: 'account/settings' },
              { element: <RoutineCreatePage />, path: 'routines/new' },
              { element: <CustomizedRoutineCreatePage />, path: 'routines/:routineId/customize' },
            ],
          },
          { element: <RoutineDetailPage />, path: 'routines/:routineId' },
          { element: <PublicAccountPage />, path: 'accounts/:accountId' },
        ],
      },
    ],
  },
]);
