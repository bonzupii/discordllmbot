/**
 * Main content area wrapper with styling.
 * @module components/Layout/MainContent
 */
import { ReactNode } from 'react';
import { Box, Toolbar, Container } from '@mui/material';

/**
 * Props for the MainContent component.
 */
interface MainContentProps {
  /** Child elements to render */
  children: ReactNode;
  /** Width of the drawer */
  drawerWidth?: number;
  /** Whether currently on mobile */
  isMobile?: boolean;
}

/**
 * Main content container with padding and scroll handling.
 * @param props - Component props
 * @returns Rendered main content component
 */
export default function MainContent({ children, drawerWidth = 240, isMobile = false }: MainContentProps) {
  return (
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
        marginLeft: isMobile ? 0 : 0,
        width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Toolbar />
      <Container 
        maxWidth="xl" 
        sx={{ 
          mt: 2, 
          mb: 2, 
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
