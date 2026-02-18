/**
 * Top application header with branding and health status.
 * @module components/Layout/Header
 */
import { AppBar, IconButton, Toolbar, Typography, Chip, Box } from '@mui/material';
import { Menu as MenuIcon, GitHub as GitHubIcon } from '@mui/icons-material';
import type { HealthResponse } from '@types';
import type { Theme } from '@mui/material/styles';

/**
 * Props for the Header component.
 */
interface HeaderProps {
  /** Whether the sidebar is open */
  open: boolean;
  /** Callback when menu button is clicked */
  onMenuClick: () => void;
  /** Current health status from the API */
  health?: HealthResponse | null;
}

const drawerWidth = 240;

/**
 * Header component displaying app title, health status, and GitHub link.
 * @param props - Component props
 * @returns Rendered header component
 */
export default function Header({ open, onMenuClick, health }: HeaderProps) {
  return (
    <AppBar
      position="absolute"
      open={open}
      sx={{
        zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
        transition: (theme: Theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        ...(open && {
          marginLeft: drawerWidth,
          width: `calc(100% - ${drawerWidth}px)`,
          transition: (theme: Theme) =>
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
          onClick={onMenuClick}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {health ? (
            <Chip
              label={`API: ${health.status}`}
              color={health.status === 'ok' ? 'success' : 'error'}
              size="small"
              variant="filled"
              sx={{
                height: 24,
                bgcolor: health.status === 'ok' ? 'success.main' : 'error.main',
                color: 'white',
              }}
            />
          ) : (
            <Typography variant="caption" color="inherit">
              Connecting...
            </Typography>
          )}
          <IconButton
            color="inherit"
            href="https://github.com/lnorton89/discordllmbot"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
            size="small"
          >
            <GitHubIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
