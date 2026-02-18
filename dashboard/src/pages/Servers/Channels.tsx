/**
 * Channel monitoring component for server channels.
 * @module pages/Servers/Channels
 */
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';

/** Channel monitoring table component with pagination. */
function Channels({
  guildId,
  channels,
  config,
  serverConfig,
  loading,
  error,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onToggle,
}) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
          Loading channels...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load channels</Alert>;
  }

  if (!channels || channels.length === 0) {
    return (
      <Alert severity="info">No channels found for this server yet.</Alert>
    );
  }

  const totalPages = Math.ceil(channels.length / rowsPerPage);
  const currentPage = page >= totalPages ? 0 : page;

  const paginatedChannels = channels.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  const activeConfig = serverConfig || config;

  return (
    <>
      <TableContainer>
        <Table size="small" aria-label="channels">
          <TableHead>
            <TableRow>
              <TableCell>Channel Name</TableCell>
              <TableCell align="center">Monitored</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedChannels.map((channel) => {
              const isMonitored = !isChannelIgnored(
                activeConfig,
                guildId,
                channel.id
              );

              return (
                <TableRow
                  key={channel.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        #{channel.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={isMonitored}
                      onChange={() => onToggle(guildId, channel.id)}
                      size="small"
                      aria-label={`Toggle monitoring for #${channel.name}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 20, 50]}
        component="div"
        count={channels.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  );
}

// Import helper function
import { isChannelIgnored } from '@utils';

export default Channels;
