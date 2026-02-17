import { ReactNode } from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 4,
        textAlign: 'center',
        borderRadius: 2,
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, color: 'text.secondary' }}>
          {icon}
        </Box>
      )}
      {title && (
        <Typography variant="h6" gutterBottom fontWeight="bold">
          {title}
        </Typography>
      )}
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
      {action && <Box sx={{ mt: 3 }}>{action}</Box>}
    </Paper>
  );
}
