import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Toolbar,
  IconButton,
  Divider,
  List,
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  items: NavItem[];
}

const drawerWidth = 240;

export default function Sidebar({ open, onToggle, items }: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        '& .MuiDrawer-paper': {
          position: 'relative',
          whiteSpace: 'nowrap',
          width: drawerWidth,
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
            width: (theme: Theme) =>
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
        <IconButton onClick={onToggle} aria-label="collapse drawer">
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List component="nav" role="navigation" aria-label="main navigation">
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={Link}
            to={item.to}
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
              mx: 1,
              borderRadius: 1,
            }}
            aria-current={location.pathname === item.to ? 'page' : undefined}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontWeight: location.pathname === item.to ? 'bold' : 'medium' }}
            />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
