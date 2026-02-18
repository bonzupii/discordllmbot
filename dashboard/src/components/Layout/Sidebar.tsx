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
} from '@mui/material';
import { ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';

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
  onNavClick 
}: SidebarProps) {
  const location = useLocation();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const drawerContent = (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'flex-end' : 'flex-end',
          px: [1],
        }}
      >
        {isMobile ? (
          <IconButton onClick={onToggle} aria-label="close drawer">
            <ChevronLeftIcon />
          </IconButton>
        ) : (
          <IconButton onClick={onToggle} aria-label="collapse drawer">
            <ChevronLeftIcon />
          </IconButton>
        )}
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
              mx: { xs: 0.5, sm: 1 },
              borderRadius: 1,
              minHeight: 44,
            }}
            aria-current={location.pathname === item.to ? 'page' : undefined}
          >
            <ListItemIcon sx={{ color: 'text.secondary', minWidth: { xs: 36, sm: 40 } }}>
              {item.icon}
            </ListItemIcon>
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
          </ListItemButton>
        ))}
      </List>
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
          width: open ? drawerWidth : 72,
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
            width: 72,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
