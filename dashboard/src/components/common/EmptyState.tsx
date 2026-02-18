/**
 * Empty state placeholder component.
 * @module components/common/EmptyState
 */
import { ReactNode } from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Props for the EmptyState component.
 */
interface EmptyStateProps {
  /** Optional icon to display */
  icon?: ReactNode;
  /** Title text */
  title?: string;
  /** Description message */
  message?: string;
  /** Optional action button or element */
  action?: ReactNode;
}

/**
 * Displays a placeholder when no content is available.
 * @param props - Component props
 * @returns Rendered empty state component
 */
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
