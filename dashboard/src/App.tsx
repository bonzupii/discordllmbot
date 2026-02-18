/**
 * Main application component with routing and layout.
 * @module App
 */
import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Dns as DnsIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  ListAlt as ListAltIcon,
} from '@mui/icons-material';

import theme from '@theme';
import { Dashboard, Settings, Servers, Playground, Logs } from '@pages';
import { ErrorBoundary } from '@components/common';
import { Header, Sidebar, MainContent } from '@components/Layout';
import { useHealth } from '@hooks';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/servers', label: 'Servers', icon: <DnsIcon /> },
  { to: '/playground', label: 'Playground', icon: <ChatIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
  { to: '/logs', label: 'Logs', icon: <ListAltIcon /> },
];

function AppContent() {
  const [open, setOpen] = useState(true);
  const { health } = useHealth();

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header open={open} onMenuClick={toggleDrawer} health={health} />
      <Sidebar open={open} onToggle={toggleDrawer} items={NAV_ITEMS} />
      <MainContent>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard health={health} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </ErrorBoundary>
      </MainContent>
    </Box>
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
