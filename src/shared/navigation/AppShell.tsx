import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { useMemo, type ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import messages from '../message/message.json';

const desktopNavigationWidth = 240;

type NavigationItem = {
  icon: ReactNode;
  label: string;
  path: string;
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      {
        icon: <HomeOutlinedIcon />,
        label: messages.navigation.feed,
        path: '/',
      },
      {
        icon: <AccountCircleOutlinedIcon />,
        label: messages.navigation.account,
        path: '/account',
      },
    ],
    [],
  );
  const mobileNavigationValue = location.pathname === '/routines/new'
    ? '/routines/new'
    : location.pathname === '/account'
      ? '/account'
      : '/';

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Drawer
        sx={{
          display: {
            lg: 'block',
            xs: 'none',
          },
          width: desktopNavigationWidth,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: desktopNavigationWidth,
          },
        }}
        variant="permanent"
      >
        <Toolbar>
          <Box>
            <Typography component="p" variant="h6">
              {messages.app.name}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {messages.app.tagline}
            </Typography>
          </Box>
        </Toolbar>
        <List aria-label={messages.navigation.ariaLabel}>
          {navigationItems.map((item) => (
            <ListItemButton
              component={RouterLink}
              key={item.path}
              selected={mobileNavigationValue === item.path}
              to={item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
          <ListItemButton
            component={RouterLink}
            selected={mobileNavigationValue === '/routines/new'}
            to="/routines/new"
          >
            <ListItemIcon>
              <AddCircleOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary={messages.navigation.createRoutine} />
          </ListItemButton>
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          pb: {
            lg: 0,
            xs: 8,
          },
        }}
      >
        <Outlet />
      </Box>

      <BottomNavigation
        aria-label={messages.navigation.ariaLabel}
        onChange={(_event, path: string) => navigate(path)}
        showLabels
        sx={{
          bottom: 0,
          display: {
            lg: 'none',
            xs: 'flex',
          },
          left: 0,
          position: 'fixed',
          right: 0,
        }}
        value={mobileNavigationValue}
      >
        <BottomNavigationAction
          icon={<HomeOutlinedIcon />}
          label={messages.navigation.feed}
          value="/"
        />
        <BottomNavigationAction
          icon={<AddCircleOutlinedIcon />}
          label={messages.navigation.createRoutine}
          value="/routines/new"
        />
        <BottomNavigationAction
          icon={<AccountCircleOutlinedIcon />}
          label={messages.navigation.account}
          value="/account"
        />
      </BottomNavigation>
    </Box>
  );
}
