/**
 * Main application component with routing and layout.
 * @module App
 */
import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, useMediaQuery } from '@mui/material';
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

const DRAWER_WIDTH = 240;

/**
 * Main app content with layout management.
 * Handles responsive drawer state for mobile.
 */
function AppContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { health } = useHealth();

  /**
   * Toggle mobile drawer open/close
   */
  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  /**
   * Close drawer when navigating (mobile)
   */
  const handleNavClick = useCallback(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header 
        open={!mobileOpen} 
        onMenuClick={handleDrawerToggle} 
        health={health} 
        drawerWidth={DRAWER_WIDTH}
      />
      <Sidebar
        open={!mobileOpen}
        onToggle={handleDrawerToggle}
        items={NAV_ITEMS}
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onNavClick={handleNavClick}
      />
      <MainContent drawerWidth={DRAWER_WIDTH} isMobile={isMobile}>
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
