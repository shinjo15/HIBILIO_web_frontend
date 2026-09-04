import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AddIcon from '@mui/icons-material/Add';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import {
  Box,
  ButtonBase,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HibilioMark } from '../brand/HibilioMark';
import messages from '../message/message.json';

const desktopNavigationWidth = 224;

type NavigationItem = {
  icon: ReactNode;
  label: string;
  path: string;
};

const navigationItems: NavigationItem[] = [
  {
    icon: <HomeOutlinedIcon fontSize="small" />,
    label: messages.navigation.feed,
    path: '/',
  },
  {
    icon: <AccountCircleOutlinedIcon fontSize="small" />,
    label: messages.navigation.account,
    path: '/account',
  },
];

function selectedPath(pathname: string): string {
  if (pathname === '/account') {
    return '/account';
  }

  if (pathname === '/routines/new') {
    return '/routines/new';
  }

  return '/';
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = selectedPath(location.pathname);

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
            backgroundColor: 'background.paper',
            borderRightColor: 'divider',
            boxSizing: 'border-box',
            width: desktopNavigationWidth,
          },
        }}
        variant="permanent"
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2.5, py: 3 }}>
          <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
            <HibilioMark />
            <Typography component="p" sx={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, letterSpacing: '0.04em' }}>
              {messages.app.name}
            </Typography>
          </Box>
          <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
            {messages.app.tagline}
          </Typography>
        </Box>

        <List aria-label={messages.navigation.ariaLabel} sx={{ p: 1.5 }}>
          {navigationItems.map((item) => (
            <ListItemButton
              component={RouterLink}
              key={item.path}
              selected={activePath === item.path}
              sx={{
                borderRadius: 2 / 3,
                color: 'text.secondary',
                gap: 1,
                mb: 0.5,
                px: 1.5,
                py: 1.25,
                '&.Mui-selected': {
                  backgroundColor: 'var(--hibilio-color-muted)',
                  color: 'primary.main',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'var(--hibilio-color-muted)',
                },
                '&:hover': {
                  backgroundColor: 'var(--hibilio-color-muted)',
                  color: 'text.primary',
                },
              }}
              to={item.path}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 28 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: 14,
                      fontWeight: 500,
                    },
                  },
                }}
              />
            </ListItemButton>
          ))}
          <ListItemButton
            component={RouterLink}
            selected={activePath === '/routines/new'}
            sx={{
              backgroundColor: 'primary.main',
              borderRadius: 2 / 3,
              color: 'primary.contrastText',
              gap: 1,
              mt: 2,
              px: 1.5,
              py: 1.25,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
              },
              '&:hover': {
                backgroundColor: 'primary.main',
                opacity: 0.9,
              },
            }}
            to="/routines/new"
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 28 }}>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={messages.navigation.createRoutine}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: 14,
                    fontWeight: 500,
                  },
                },
              }}
            />
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

      <Box
        aria-label={messages.navigation.ariaLabel}
        component="nav"
        sx={{
          alignItems: 'center',
          backgroundColor: 'background.paper',
          borderColor: 'divider',
          borderTop: 1,
          bottom: 0,
          display: {
            lg: 'none',
            xs: 'flex',
          },
          height: 64,
          justifyContent: 'space-around',
          left: 0,
          position: 'fixed',
          right: 0,
          zIndex: 1100,
        }}
      >
        {navigationItems.map((item) => {
          const isSelected = activePath === item.path;

          return (
            <ButtonBase
              aria-current={isSelected ? 'page' : undefined}
              aria-label={item.label}
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                color: isSelected ? 'primary.main' : 'text.secondary',
                display: 'flex',
                flexDirection: 'column',
                fontSize: 10,
                fontWeight: 500,
                gap: 0.25,
                height: '100%',
                justifyContent: 'center',
                minWidth: 76,
              }}
            >
              {item.icon}
              {item.label}
            </ButtonBase>
          );
        }).slice(0, 1)}
        <ButtonBase
          aria-current={activePath === '/routines/new' ? 'page' : undefined}
          aria-label={messages.navigation.createRoutine}
          onClick={() => navigate('/routines/new')}
          sx={{
            alignItems: 'center',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            minWidth: 76,
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              backgroundColor: 'primary.main',
              borderRadius: '50%',
              color: 'primary.contrastText',
              display: 'flex',
              height: 48,
              justifyContent: 'center',
              marginTop: -2.5,
              width: 48,
            }}
          >
            <AddIcon />
          </Box>
        </ButtonBase>
        {navigationItems.slice(1).map((item) => {
          const isSelected = activePath === item.path;

          return (
            <ButtonBase
              aria-current={isSelected ? 'page' : undefined}
              aria-label={item.label}
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                color: isSelected ? 'primary.main' : 'text.secondary',
                display: 'flex',
                flexDirection: 'column',
                fontSize: 10,
                fontWeight: 500,
                gap: 0.25,
                height: '100%',
                justifyContent: 'center',
                minWidth: 76,
              }}
            >
              {item.icon}
              {item.label}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
