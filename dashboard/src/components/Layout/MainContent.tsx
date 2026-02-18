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
}

/**
 * Main content container with padding and scroll handling.
 * @param props - Component props
 * @returns Rendered main content component
 */
export default function MainContent({ children }: MainContentProps) {
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
      }}
    >
      <Toolbar />
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        {children}
      </Container>
    </Box>
  );
}
