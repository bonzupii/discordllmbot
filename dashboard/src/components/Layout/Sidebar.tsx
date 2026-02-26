/**
 * Navigation sidebar with collapsible menu.
 * @module components/Layout/Sidebar
 */
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Toolbar,
  IconButton,
  Divider,
  List,
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Chip,
  Box,
} from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';
import type { HealthResponse } from '@types';

/**
 * Navigation item structure for sidebar links.
 */
interface NavItem {
  /** Route path */
  to: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: ReactNode;
}

/**
 * Props for the Sidebar component.
 */
interface SidebarProps {
  /** Whether the sidebar is expanded */
  open: boolean;
  /** Callback when toggle button is clicked */
  onToggle: () => void;
  /** Array of navigation items to display */
  items: NavItem[];
  /** Width of the drawer */
  drawerWidth: number;
  /** Whether the mobile drawer is open */
  mobileOpen?: boolean;
  /** Callback when navigation item is clicked */
  onNavClick?: () => void;
  /** Current health status from the API */
  health?: HealthResponse | null;
  /** Current API connection state */
  apiConnectionState?: 'connected' | 'connecting' | 'error';
}

/**
 * Sidebar component with navigation links.
 * Responsive - uses temporary drawer on mobile, permanent on desktop.
 * @param props - Component props
 * @returns Rendered sidebar component
 */
export default function Sidebar({ 
  open, 
  onToggle, 
  items, 
  drawerWidth, 
  mobileOpen = false,
  onNavClick,
  health,
  apiConnectionState = 'connecting',
}: SidebarProps) {
  const location = useLocation();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const drawerContent = (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: (!isMobile && open) ? 'flex-end' : 'center',
          px: (!isMobile && open) ? [1] : 0,
        }}
      >
        <IconButton onClick={onToggle} aria-label={open ? 'collapse drawer' : 'expand drawer'}>
          {(!isMobile && open) ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List 
        component="nav" 
        role="navigation" 
        aria-label="main navigation"
        sx={{ px: { xs: 0.5, sm: 1 } }}
      >
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={Link}
            to={item.to}
            onClick={onNavClick}
            selected={location.pathname === item.to}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.main',
                },
                '& .MuiListItemIcon-root': {
                  color: 'secondary.contrastText',
                },
              },
              '&:hover': {
                bgcolor: 'action.hover',
              },
              mb: 0.5,
              mx: isMobile ? 0 : (open ? 1 : 0),
              borderRadius: 1,
              minHeight: 44,
              justifyContent: isMobile ? 'flex-start' : (open ? 'flex-start' : 'center'),
              px: isMobile ? 2 : (open ? 2 : 1),
              width: isMobile ? '100%' : (open ? 'auto' : '100%'),
            }}
            aria-current={location.pathname === item.to ? 'page' : undefined}
          >
            <ListItemIcon sx={{ 
              color: 'text.secondary', 
              minWidth: isMobile ? 40 : (open ? 40 : 'auto'),
              justifyContent: 'center',
            }}>
              {item.icon}
            </ListItemIcon>
            {(!isMobile && open) && (
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    fontWeight: location.pathname === item.to ? 'bold' : 'medium',
                    fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                    noWrap: true,
                  }
                }}
              />
            )}
            {isMobile && (
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    fontWeight: location.pathname === item.to ? 'bold' : 'medium',
                    fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                    noWrap: true,
                  }
                }}
              />
            )}
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      {(isMobile || open) && (
        <Box sx={{ p: 2 }}>
          <Chip
            label={
              apiConnectionState === 'connected'
                ? `API: ${health?.status ?? 'ok'}`
                : apiConnectionState === 'error'
                  ? 'API: Reconnecting...'
                  : 'API: Connecting...'
            }
            color={apiConnectionState === 'connected' ? 'success' : apiConnectionState === 'error' ? 'warning' : 'default'}
            size="small"
            variant="filled"
            sx={{
              width: '100%',
              bgcolor:
                apiConnectionState === 'connected'
                  ? 'success.main'
                  : apiConnectionState === 'error'
                    ? 'warning.main'
                    : undefined,
              color: apiConnectionState === 'connecting' ? undefined : 'white',
            }}
          />
        </Box>
      )}
    </>
  );

  // Mobile: use temporary drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            bgcolor: 'background.default',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop: use permanent drawer
  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        '& .MuiDrawer-paper': {
          position: 'relative',
          whiteSpace: 'nowrap',
          width: open ? drawerWidth : 56,
          transition: (theme: Theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          boxSizing: 'border-box',
          ...(!open && {
            overflowX: 'hidden',
            transition: (theme: Theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            width: 56,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
