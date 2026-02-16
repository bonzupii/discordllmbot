import { Box, CircularProgress, Typography } from '@mui/material';

export function LoadingState({ message = 'Loading...' }) {
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
