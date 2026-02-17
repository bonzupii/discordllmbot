import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TablePagination,
  Chip,
  Tooltip,
  Avatar,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import type { Relationship } from '@types';

interface RelationshipsProps {
  guildId: string;
  relationships: Record<string, Relationship & { avatarUrl?: string; displayName?: string; username?: string }>;
  loading: boolean;
  error: Error | null;
  page?: number;
  rowsPerPage?: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: (userId: string, data: Relationship & { avatarUrl?: string; displayName?: string; username?: string }) => void;
  onIgnoreToggle: (guildId: string, userId: string, data: Relationship & { avatarUrl?: string; displayName?: string; username?: string }) => void;
}

function Relationships({
  guildId,
  relationships,
  loading,
  error,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onIgnoreToggle,
}: RelationshipsProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
          Loading relationships...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load relationships.</Alert>;
  }

  const entries = Object.entries(relationships);
  const emptyRows = rowsPerPage - Math.min(rowsPerPage, entries.length);

  if (entries.length === 0) {
    return <Alert severity="info">No relationships found for this server.</Alert>;
  }

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Attitude</TableCell>
              <TableCell>Behaviors</TableCell>
              <TableCell align="center">Ignored</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(([userId, data]) => (
                <TableRow key={userId}>
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={data.avatarUrl}
                        alt={data.displayName || data.username}
                        sx={{ width: 32, height: 32 }}
                        imgProps={{ loading: 'lazy' }}
                      />
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {data.displayName || data.username || userId}
                        </Typography>
                        {data.username && data.username !== data.displayName && (
                          <Typography variant="caption" color="text.secondary">
                            ({data.username})
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={data.attitude}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <Tooltip title={data.behavior.join(', ')}>
                      <Typography variant="body2" noWrap>
                        {data.behavior.join(', ') || 'None'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={data.ignored || false}
                      onChange={() => onIgnoreToggle(guildId, userId, data)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(userId, data)}
                      aria-label={`Edit ${userId}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell sx={{ gridColumn: '1 / -1' }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={entries.length}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Box>
  );
}

export default Relationships;
