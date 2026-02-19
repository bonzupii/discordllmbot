/**
 * Top application header with branding.
 * @module components/Layout/Header
 */
import { AppBar, IconButton, Toolbar, Typography, Box, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon, GitHub as GitHubIcon } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

/**
 * Props for the Header component.
 */
interface HeaderProps {
  /** Whether the sidebar is open */
  open: boolean;
  /** Callback when menu button is clicked */
  onMenuClick: () => void;
  /** Width of the drawer */
  drawerWidth: number;
}

/**
 * Header component displaying app title and GitHub link.
 * @param props - Component props
 * @returns Rendered header component
 */
export default function Header({ open, onMenuClick, drawerWidth }: HeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <AppBar
      position="fixed"
      open={open}
      sx={{
        zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
        width: isMobile ? '100%' : (open ? `calc(100% - ${drawerWidth}px)` : '100%'),
        marginLeft: isMobile ? 0 : (open ? drawerWidth : 0),
        transition: (theme: Theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        ...(open && !isMobile && {
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
          sx={{ marginRight: '36px' }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          sx={{ flexGrow: 1, fontSize: { xs: '0.9rem', sm: '1rem' } }}
        >
          DiscordLLMBot
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
