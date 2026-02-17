import {
  Box,
  Typography,
  IconButton,
  Button,
  Collapse,
  TableRow,
  TableCell,
  Avatar,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Forum as ForumIcon,
} from '@mui/icons-material';

import ServerConfig from './ServerConfig';
import Relationships from './Relationships';
import Channels from './Channels';

function ServerRow({
  server,
  expanded,
  onExpand,
  onLeave,
  onEditUser,
  onIgnoreToggle,
  relationships,
  loadingRelationships,
  channels,
  loadingChannels,
  onChannelToggle,
  config,
  serverConfigs,
  loadingConfigs,
  savingConfigs,
  onConfigUpdate,
  onResetToDefault,
  serverTabs,
  onTabChange,
  relationshipPages,
  setRelationshipPages,
  relationshipRowsPerPage,
  setRelationshipRowsPerPage,
  channelPages,
  setChannelPages,
  channelRowsPerPage,
  setChannelRowsPerPage,
  isRestarting,
}) {
  const isOpen = expanded === server.id;
  const currentTab = serverTabs[server.id] || 0;
  const serverConfig = serverConfigs[server.id];

  const currentRelationshipPage = relationshipPages[server.id] || 0;
  const currentRelationshipRowsPerPage =
    relationshipRowsPerPage[server.id] || 10;
  const currentChannelPage = channelPages[server.id] || 0;
  const currentChannelRowsPerPage = channelRowsPerPage[server.id] || 10;

  const handleTabChange = (event, newValue) => {
    onTabChange(server.id, newValue);
  };

  const handleRelationshipsPageChange = (event, newPage) => {
    setRelationshipPages((prev) => ({ ...prev, [server.id]: newPage }));
  };

  const handleRelationshipsRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRelationshipRowsPerPage((prev) => ({
      ...prev,
      [server.id]: newRowsPerPage,
    }));
    setRelationshipPages((prev) => ({ ...prev, [server.id]: 0 }));
  };

  const handleChannelsPageChange = (event, newPage) => {
    setChannelPages((prev) => ({ ...prev, [server.id]: newPage }));
  };

  const handleChannelsRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setChannelRowsPerPage((prev) => ({
      ...prev,
      [server.id]: newRowsPerPage,
    }));
    setChannelPages((prev) => ({ ...prev, [server.id]: 0 }));
  };

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
        }}
        onClick={() => onExpand(server.id)}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onExpand(server.id);
            }}
          >
            {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={server.iconURL}
              alt={server.name}
              variant="rounded"
              imgProps={{ loading: 'lazy' }}
            />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {server.name}
              </Typography>
              {server.memberCount && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <PeopleIcon sx={{ fontSize: 12 }} />{' '}
                  {server.memberCount - 1}{' '}
                  {server.memberCount - 1 === 1 ? 'member' : 'members'}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell align="right">
          {server.joinedAt
            ? new Date(server.joinedAt).toLocaleDateString()
            : 'Unknown'}
        </TableCell>
        <TableCell align="right">
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={(e) => { e.stopPropagation(); onLeave(server.id); }}
            aria-label={`Leave ${server.name}`}
          >
            Leave
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ paddingBottom: 0, paddingTop: 0, gridColumn: '1 / -1' }}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                sx={{
                  mb: 2,
                  minHeight: 32,
                  '& .MuiTab-root': { minHeight: 32, minWidth: 120 },
                }}
                aria-label="server tabs"
              >
                <Tab
                  icon={<SettingsIcon />}
                  iconPosition="start"
                  label="Server Config"
                />
                <Tab
                  icon={<PeopleIcon />}
                  iconPosition="start"
                  label="User Relationships"
                />
                <Tab
                  icon={<ForumIcon />}
                  iconPosition="start"
                  label="Channel Monitoring"
                />
              </Tabs>

              {/* Server Configuration Tab Panel */}
              <Box hidden={currentTab !== 0}>
                {loadingConfigs[server.id] ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                    <Typography
                      variant="body2"
                      sx={{ ml: 2, alignSelf: 'center' }}
                    >
                      Loading configuration...
                    </Typography>
                  </Box>
                ) : serverConfig ? (
                  <ServerConfig
                    guildId={server.id}
                    config={serverConfig}
                    loading={loadingConfigs[server.id]}
                    saving={savingConfigs[server.id]}
                    isRestarting={isRestarting}
                    onUpdate={onConfigUpdate}
                    onReset={onResetToDefault}
                  />
                ) : (
                  <Alert severity="info">No configuration found.</Alert>
                )}
              </Box>

              {/* User Relationships Tab Panel */}
              <Box hidden={currentTab !== 1}>
                <Relationships
                  guildId={server.id}
                  relationships={relationships[server.id]}
                  loading={loadingRelationships[server.id]}
                  error={null}
                  page={currentRelationshipPage}
                  rowsPerPage={currentRelationshipRowsPerPage}
                  onPageChange={handleRelationshipsPageChange}
                  onRowsPerPageChange={handleRelationshipsRowsPerPageChange}
                  onEdit={onEditUser}
                  onIgnoreToggle={onIgnoreToggle}
                />
              </Box>

              {/* Channel Monitoring Tab Panel */}
              <Box hidden={currentTab !== 2}>
                <Channels
                  guildId={server.id}
                  channels={channels[server.id]}
                  config={config}
                  serverConfig={serverConfig}
                  loading={loadingChannels[server.id]}
                  error={null}
                  page={currentChannelPage}
                  rowsPerPage={currentChannelRowsPerPage}
                  onPageChange={handleChannelsPageChange}
                  onRowsPerPageChange={handleChannelsRowsPerPageChange}
                  onToggle={onChannelToggle}
                />
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default ServerRow;
