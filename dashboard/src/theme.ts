/**
 * MUI Theme Configuration
 * Dark theme with violet/pink accent colors
 * @module theme
 */

import { createTheme } from '@mui/material/styles';

/**
 * Rainbow color palettes for charts and visualizations
 * Each palette has multiple shades for different data lengths
 */
export const rainbowPalettes = {
  palette5: [
    '#f87171', // Red
    '#fb923c', // Orange
    '#facc15', // Yellow
    '#4ade80', // Green
    '#60a5fa', // Blue
  ],
  palette6: [
    '#f87171', // Red
    '#fb923c', // Orange
    '#facc15', // Yellow
    '#4ade80', // Green
    '#60a5fa', // Blue
    '#a78bfa', // Violet
  ],
  palette7: [
    '#f87171', // Red
    '#fb923c', // Orange
    '#facc15', // Yellow
    '#4ade80', // Green
    '#60a5fa', // Blue
    '#a78bfa', // Violet
    '#f472b6', // Pink
  ],
  palette8: [
    '#f87171', // Red
    '#fb923c', // Orange
    '#facc15', // Yellow
    '#4ade80', // Green
    '#2dd4bf', // Teal
    '#60a5fa', // Blue
    '#a78bfa', // Violet
    '#f472b6', // Pink
  ],
  palette9: [
    '#f87171', // Red
    '#fb923c', // Orange
    '#facc15', // Yellow
    '#4ade80', // Green
    '#2dd4bf', // Teal
    '#60a5fa', // Blue
    '#818cf8', // Indigo
    '#a78bfa', // Violet
    '#f472b6', // Pink
  ],
  palette10: [
    '#ef4444', // Red-500
    '#f97316', // Orange-500
    '#eab308', // Yellow-500
    '#22c55e', // Green-500
    '#14b8a6', // Teal-500
    '#3b82f6', // Blue-500
    '#6366f1', // Indigo-500
    '#8b5cf6', // Violet-500
    '#ec4899', // Pink-500
    '#f43f5e', // Rose-500
  ],
};

export const chartColors = {
  messages: '#60a5fa',
  repliesSent: '#4ade80',
  repliesDeclined: '#f87171',
  latency: '#fb923c',
  tokens: '#facc15',
  users: '#a78bfa',
  errors: '#f472b6',
};

/**
 * Custom dark theme for DiscordLLMBot dashboard
 * Uses violet as primary color and pink as secondary
 */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a78bfa', // Violet-400: Less blue, more purple
      light: '#c4b5fd',
      dark: '#7c3aed',
      contrastText: '#0f172a',
    },
    secondary: {
      main: '#f472b6', // Pink-400
      light: '#fbcfe8',
      dark: '#db2777',
      contrastText: '#0f172a',
    },
    background: {
      default: '#1a1a1a', // Dark grey
      paper: '#333333',   // Lighter neutral gray-700 (better contrast)
    },
    text: {
      primary: '#f5f5f5', // More neutral white-gray
      secondary: '#a3a3a3', // More neutral gray-400
    },
    divider: 'rgba(163, 163, 163, 0.2)', // More neutral gray, slightly higher contrast
    success: {
      main: '#4ade80', // Green-400 (brighter, less blue undertones)
      light: '#86efac',
      dark: '#16a34a',
      contrastText: '#020617',
    },
    error: {
      main: '#f87171', // Red-400
      light: '#fca5a5',
      dark: '#dc2626',
      contrastText: '#020617',
    },
    warning: {
      main: '#facc15', // Yellow-400 (warmer, more vibrant)
      light: '#fde047',
      dark: '#d97706',
      contrastText: '#020617',
    },
    info: {
      main: '#60a5fa', // Blue-400 (vibrant blue for API logs)
      light: '#93c5fd',
      dark: '#2563eb',
      contrastText: '#020617',
    },
  },
  typography: {
    fontFamily: [
      '"Google Sans"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: 'secondary.main',
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: 'secondary.main',
    },
    h3: {
      fontWeight: 600,
      color: 'secondary.main',
    },
    h4: {
      fontWeight: 600,
      color: 'secondary.main',
    },
    h5: {
      fontWeight: 600,
      color: 'secondary.main',
    },
    h6: {
      fontWeight: 600,
      color: 'secondary.main',
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
    },
    body1: {
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#475569 #121212',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: '#121212',
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#475569',
            minHeight: 24,
            border: '2px solid #121212',
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#64748b',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#64748b',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#64748b',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
          backgroundImage: 'none', // Remove elevation overlay for cleaner look
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'background.paper', // Use theme background
          border: '1px solid rgba(163, 163, 163, 0.1)', // More neutral gray
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(163, 163, 163, 0.12)', // More neutral gray
        },
        head: {
          fontWeight: 600,
          color: '#f5f5f5 !important', // Neutral light text
          backgroundColor: '#2f2f2f !important', // Dark grey background
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
