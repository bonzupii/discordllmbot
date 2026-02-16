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
}) {
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
    return <Alert severity="error">Failed to load relationships</Alert>;
  }

  if (!relationships || Object.keys(relationships).length === 0) {
    return (
      <Alert severity="info">
        No user relationships found for this server yet.
      </Alert>
    );
  }

  const relationshipEntries = Object.entries(relationships);
  const totalPages = Math.ceil(relationshipEntries.length / rowsPerPage);
  const currentPage = page >= totalPages ? 0 : page;

  const paginatedEntries = relationshipEntries.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <TableContainer>
        <Table size="small" aria-label="relationships">
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
            {paginatedEntries.map(([userId, data]) => (
              <TableRow
                key={userId}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
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
                    aria-label={`Toggle ignore for ${data.displayName || data.username}`}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => onEdit(userId, data)}
                    aria-label={`Edit ${data.displayName || data.username}`}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 20, 50]}
        component="div"
        count={relationshipEntries.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  );
}

export default Relationships;
