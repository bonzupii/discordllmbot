import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DnsIcon from '@mui/icons-material/Dns';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

import theme from './theme';
import Settings from './components/Settings';
import Logs from './components/Logs';
import Servers from './components/Servers';
import Dashboard from './components/Dashboard';
import Playground from './components/Playground';
import { useHealth } from './hooks/useHealth';
import { ErrorBoundary } from './components/common';

const drawerWidth = 240;

function AppContent() {
  const [open, setOpen] = useState(true);
  const { health } = useHealth();

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="absolute"
        open={open}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          ...(open && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: (theme) =>
              theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }),
        }}
      >
        <Toolbar sx={{ pr: '24px' }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            sx={{ marginRight: '36px', ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            component="h1"
            variant="h6"
            color="inherit"
            noWrap
            sx={{ flexGrow: 1 }}
          >
            DiscordLLMBot Dashboard
          </Typography>
          {health ? (
            <Chip
              label={`API: ${health.status}`}
              color={health.status === 'ok' ? 'success' : 'error'}
              size="small"
              variant="filled"
              sx={{
                height: 24,
                ml: 2,
                bgcolor: health.status === 'ok' ? 'success.main' : 'error.main',
                color: 'white',
              }}
            />
          ) : (
            <Typography variant="caption" color="inherit">
              Connecting...
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={open}
        sx={{
          '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: drawerWidth,
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            boxSizing: 'border-box',
            ...(!open && {
              overflowX: 'hidden',
              transition: (theme) =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
              width: (theme) =>
                theme.breakpoints.up('sm')
                  ? theme.spacing(9)
                  : theme.spacing(7),
            }),
          },
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            px: [1],
          }}
        >
          <IconButton onClick={toggleDrawer} aria-label="collapse drawer">
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <List component="nav" role="navigation" aria-label="main navigation">
          <NavItem to="/" label="Dashboard" icon={<DashboardIcon />} />
          <NavItem to="/servers" label="Servers" icon={<DnsIcon />} />
          <NavItem to="/playground" label="Playground" icon={<ChatIcon />} />
          <NavItem to="/settings" label="Settings" icon={<SettingsIcon />} />
          <NavItem to="/logs" label="Logs" icon={<ListAltIcon />} />
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard health={health} />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/logs" element={<Logs />} />
            </Routes>
          </ErrorBoundary>
        </Container>
      </Box>
    </Box>
  );
}

function NavItem({ to, label, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <ListItemButton
      component={Link}
      to={to}
      selected={isActive}
      sx={{
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          '& .MuiListItemIcon-root': {
            color: 'primary.contrastText',
          },
        },
        mb: 0.5,
        mx: 1,
        borderRadius: 1,
      }}
      aria-current={isActive ? 'page' : undefined}
    >
      <ListItemIcon sx={{ color: 'text.secondary' }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{ fontWeight: isActive ? 'bold' : 'medium' }}
      />
    </ListItemButton>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}
