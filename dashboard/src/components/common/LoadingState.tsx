/**
 * Loading state indicator component.
 * @module components/common/LoadingState
 */
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Props for the LoadingState component.
 */
interface LoadingStateProps {
  /** Optional loading message to display */
  message?: string;
}

/**
 * Displays a loading spinner with optional message.
 * @param props - Component props
 * @returns Rendered loading state component
 */
export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 4,
      }}
    >
      <CircularProgress size={24} sx={{ mr: 2 }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
