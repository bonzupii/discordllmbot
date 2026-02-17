import { IconButton, Toolbar, Typography, Chip, Box } from '@mui/material';
import { Menu as MenuIcon, GitHub as GitHubIcon } from '@mui/icons-material';
import type { HealthResponse } from '@types';

interface HeaderProps {
  open: boolean;
  onMenuClick: () => void;
  health?: HealthResponse | null;
}

export default function Header({ open, onMenuClick, health }: HeaderProps) {
  return (
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
      <IconButton
        color="inherit"
        href="https://github.com/lnorton89/discordllmbot"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on GitHub"
        sx={{ mr: 1 }}
      >
        <GitHubIcon />
      </IconButton>
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
  );
}
