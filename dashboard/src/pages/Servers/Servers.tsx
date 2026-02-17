import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  TableCell,
  Paper,
} from '@mui/material';
import { AddLink as AddLinkIcon } from '@mui/icons-material';

import { useServers, useSocket } from '@hooks';
import { serversApi, configApi } from '@services';
import { isChannelIgnored } from '@utils';
import { EmptyState, ErrorBoundary } from '@components/common';
import { ServerRow, EditRelationshipDialog } from './index';
import type { BotConfig, Relationship } from '@types';

function Servers() {
  const { servers, botInfo, loading, error, leaveServer } = useServers();
  const { isRestarting } = useSocket();

  // Global config
  const [config, setConfig] = useState<BotConfig | null>(null);
  
  // Expanded server state
  const [expandedServerId, setExpandedServerId] = useState(null);
  
  // Tab state per server
  const [serverTabs, setServerTabs] = useState({});
  
  // Pagination state per server
  const [relationshipPages, setRelationshipPages] = useState({});
  const [relationshipRowsPerPage, setRelationshipRowsPerPage] = useState({});
  const [channelPages, setChannelPages] = useState({});
  const [channelRowsPerPage, setChannelRowsPerPage] = useState({});
  
  // Edit dialog state
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState(null);
  
  // Message state
  const [message, setMessage] = useState({
    open: false,
    text: '',
    severity: 'success',
  });

  // Server-specific data storage
  const [serverConfigs, setServerConfigs] = useState({});
  const [loadingConfigs, setLoadingConfigs] = useState({});
  const [savingConfigs, setSavingConfigs] = useState({});
  const [relationships, setRelationships] = useState({});
  const [loadingRelationships, setLoadingRelationships] = useState({});
  const [channels, setChannels] = useState({});
  const [loadingChannels, setLoadingChannels] = useState({});

  const debounceTimers = useRef({});

  // Fetch global config
  const fetchConfig = useCallback(async () => {
    try {
      const response = await configApi.getConfig();
      setConfig(response.data as BotConfig);
    } catch {
      // Silently fail - will use defaults
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const toggleExpand = useCallback((guildId) => {
    if (expandedServerId === guildId) {
      setExpandedServerId(null);
    } else {
      setExpandedServerId(guildId);
      setServerTabs((prev) => ({ ...prev, [guildId]: 0 }));
    }
  }, [expandedServerId]);

  const handleLeaveServer = async (serverId) => {
    const server = servers.find((s) => s.id === serverId);
    if (
      window.confirm(
        `Are you sure you want to remove the bot from server "${server?.name}"?`
      )
    ) {
      try {
        await leaveServer(serverId);
      } catch {
        setMessage({
          open: true,
          text: 'Failed to remove bot from server',
          severity: 'error',
        });
      }
    }
  };

  const handleTabChange = useCallback((guildId, tabIndex) => {
    setServerTabs((prev) => ({ ...prev, [guildId]: tabIndex }));
  }, []);

  const startEdit = useCallback((userId, data) => {
    setEditingUser(userId);
    setEditData({ ...data });
  }, []);

  const handleSaveRelationship = async (guildId, userId, data) => {
    try {
      await serversApi.updateRelationship(guildId, userId, data);
      setRelationships((prev) => ({
        ...prev,
        [guildId]: {
          ...prev[guildId],
          [userId]: data,
        },
      }));
      setEditingUser(null);
    } catch {
      setMessage({
        open: true,
        text: 'Failed to save relationship changes',
        severity: 'error',
      });
    }
  };

  const handleIgnoreToggle = async (guildId, userId, currentData) => {
    const newData = { ...currentData, ignored: !currentData.ignored };
    try {
      await serversApi.updateRelationship(guildId, userId, newData);
      setRelationships((prev) => ({
        ...prev,
        [guildId]: {
          ...prev[guildId],
          [userId]: newData,
        },
      }));
    } catch {
      // Silently fail
    }
  };

  const handleChannelToggle = async (guildId, channelId) => {
    let currentServerConfig = serverConfigs[guildId];
    
    if (!currentServerConfig) {
      try {
        const response = await serversApi.getServerConfig(guildId);
        currentServerConfig = response.data;
      } catch {
        const response = await configApi.getConfig();
        currentServerConfig = response.data;
      }
    }

    const updatedServerConfig = JSON.parse(JSON.stringify(currentServerConfig));

    if (!updatedServerConfig.replyBehavior.guildSpecificChannels) {
      updatedServerConfig.replyBehavior.guildSpecificChannels = {};
    }

    if (!updatedServerConfig.replyBehavior.guildSpecificChannels[guildId]) {
      updatedServerConfig.replyBehavior.guildSpecificChannels[guildId] = {
        allowed: [],
        ignored: [],
      };
    }

    const guildChannels = updatedServerConfig.replyBehavior.guildSpecificChannels[guildId];
    const isCurrentlyMonitored = !isChannelIgnored(currentServerConfig, guildId, channelId);

    if (isCurrentlyMonitored) {
      if (guildChannels.allowed && guildChannels.allowed.length > 0) {
        guildChannels.allowed = guildChannels.allowed.filter((id) => id !== channelId);
      } else {
        if (!guildChannels.ignored) guildChannels.ignored = [];
        if (!guildChannels.ignored.includes(channelId)) {
          guildChannels.ignored.push(channelId);
        }
      }
    } else {
      if (guildChannels.ignored) {
        guildChannels.ignored = guildChannels.ignored.filter((id) => id !== channelId);
      }

      if (guildChannels.allowed && Array.isArray(guildChannels.allowed)) {
        if (!guildChannels.allowed.includes(channelId)) {
          guildChannels.allowed.push(channelId);
        }
      }
    }

    try {
      await serversApi.updateServerConfig(guildId, updatedServerConfig);
      setServerConfigs((prev) => ({ ...prev, [guildId]: updatedServerConfig }));
      setMessage({
        open: true,
        text: 'Channel settings updated',
        severity: 'success',
      });
    } catch {
      setMessage({
        open: true,
        text: 'Failed to update channel monitoring settings',
        severity: 'error',
      });
    }
  };

  const handleConfigUpdate = useCallback((guildId, newConfig) => {
    if (isRestarting) return;

    if (debounceTimers.current[guildId]) {
      clearTimeout(debounceTimers.current[guildId]);
    }

    debounceTimers.current[guildId] = setTimeout(async () => {
      try {
        await serversApi.updateServerConfig(guildId, newConfig);
        setServerConfigs((prev) => ({ ...prev, [guildId]: newConfig }));
        setSavingConfigs((prev) => ({ ...prev, [guildId]: false }));
        setMessage({
          open: true,
          text: 'Settings saved automatically',
          severity: 'success',
        });
      } catch {
        setSavingConfigs((prev) => ({ ...prev, [guildId]: false }));
        setMessage({
          open: true,
          text: 'Failed to save settings',
          severity: 'error',
        });
      }
    }, 1500);
  }, [isRestarting]);

  const handleResetToDefault = async (guildId) => {
    if (window.confirm('Reset this server\'s configuration to default?')) {
      try {
        await serversApi.resetServerConfig(guildId);
        const response = await serversApi.getServerConfig(guildId);
        setServerConfigs((prev) => ({ ...prev, [guildId]: response.data }));
        setMessage({
          open: true,
          text: 'Configuration reset to default',
          severity: 'info',
        });
      } catch {
        // Handle error
      }
    }
  };

  // Fetch server-specific data when expanded
  useEffect(() => {
    if (!expandedServerId) return;

    const fetchServerData = async () => {
      // Fetch config
      if (!serverConfigs[expandedServerId] && !loadingConfigs[expandedServerId]) {
        setLoadingConfigs((prev) => ({ ...prev, [expandedServerId]: true }));
        try {
          const response = await serversApi.getServerConfig(expandedServerId);
          setServerConfigs((prev) => ({ ...prev, [expandedServerId]: response.data }));
        } catch {
          // Handle error
        } finally {
          setLoadingConfigs((prev) => ({ ...prev, [expandedServerId]: false }));
        }
      }

      // Fetch relationships
      if (!relationships[expandedServerId] && !loadingRelationships[expandedServerId]) {
        setLoadingRelationships((prev) => ({ ...prev, [expandedServerId]: true }));
        try {
          const response = await serversApi.getRelationships(expandedServerId);
          setRelationships((prev) => ({ ...prev, [expandedServerId]: response.data }));
        } catch {
          setRelationships((prev) => ({ ...prev, [expandedServerId]: {} }));
        } finally {
          setLoadingRelationships((prev) => ({ ...prev, [expandedServerId]: false }));
        }
      }

      // Fetch channels
      if (!channels[expandedServerId] && !loadingChannels[expandedServerId]) {
        setLoadingChannels((prev) => ({ ...prev, [expandedServerId]: true }));
        try {
          const response = await serversApi.getChannels(expandedServerId);
          setChannels((prev) => ({ ...prev, [expandedServerId]: response.data }));
        } catch {
          setChannels((prev) => ({ ...prev, [expandedServerId]: [] }));
        } finally {
          setLoadingChannels((prev) => ({ ...prev, [expandedServerId]: false }));
        }
      }
    };

    fetchServerData();
  }, [expandedServerId, serverConfigs, loadingConfigs, relationships, loadingRelationships, channels, loadingChannels]);

  const closeMessage = () => {
    setMessage({ ...message, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
        {error.message || 'Failed to load server data'}
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ width: '100%', p: 2 }}>
        {servers.length === 0 ? (
          <EmptyState
            title="No Servers"
            message="The bot is not in any servers yet."
          />
        ) : (
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table aria-label="collapsible table">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Server Name
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      Join Date
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      Actions
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {servers.map((server) => (
                  <ServerRow
                    key={server.id}
                    server={server}
                    expanded={expandedServerId}
                    onExpand={toggleExpand}
                    onLeave={handleLeaveServer}
                    onEditUser={startEdit}
                    onIgnoreToggle={handleIgnoreToggle}
                    relationships={relationships}
                    loadingRelationships={loadingRelationships}
                    channels={channels}
                    loadingChannels={loadingChannels}
                    onChannelToggle={handleChannelToggle}
                    config={config}
                    serverConfigs={serverConfigs}
                    loadingConfigs={loadingConfigs}
                    savingConfigs={savingConfigs}
                    onConfigUpdate={handleConfigUpdate}
                    onResetToDefault={handleResetToDefault}
                    serverTabs={serverTabs}
                    onTabChange={handleTabChange}
                    relationshipPages={relationshipPages}
                    setRelationshipPages={setRelationshipPages}
                    relationshipRowsPerPage={relationshipRowsPerPage}
                    setRelationshipRowsPerPage={setRelationshipRowsPerPage}
                    channelPages={channelPages}
                    setChannelPages={setChannelPages}
                    channelRowsPerPage={channelRowsPerPage}
                    setChannelRowsPerPage={setChannelRowsPerPage}
                    isRestarting={isRestarting}
                  />
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Invite Bot Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {botInfo && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddLinkIcon />}
              href={botInfo.inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Invite Bot
            </Button>
          )}
        </Box>

        {/* Edit Dialog */}
        {editingUser && expandedServerId && (
          <EditRelationshipDialog
            key={editingUser}
            open={!!editingUser}
            userId={editingUser}
            data={editData || undefined}
            onClose={() => setEditingUser(null)}
            onSave={(userId, data) => handleSaveRelationship(expandedServerId, userId, data)}
          />
        )}

        <Snackbar
          open={message.open}
          autoHideDuration={3000}
          onClose={closeMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={message.severity as 'success' | 'error' | 'warning' | 'info'}
            variant="filled"
            onClose={closeMessage}
          >
            {message.text}
          </Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
}

export default Servers;
