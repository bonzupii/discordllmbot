import { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Avatar,
  Tabs,
  Tab,
  TablePagination,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddLink as AddLinkIcon,
  People as PeopleIcon,
  Forum as ForumIcon,
} from "@mui/icons-material";

// Define isChannelIgnored function outside of components so it's accessible to both
const isChannelIgnored = (config, guildId, channelId) => {
  if (!config) return false; // If config isn't loaded yet, assume not ignored
  
  const { ignoreChannels = [], guildSpecificChannels = {} } = config?.replyBehavior || {};
  
  // Check global ignore list
  if (ignoreChannels.includes(channelId)) {
    return true;
  }
  
  // Check guild-specific settings
  const guildChannels = guildSpecificChannels[guildId];
  if (guildChannels) {
    // If allowed channels are specified, only those are monitored
    if (Array.isArray(guildChannels.allowed) && guildChannels.allowed.length > 0) {
      return !guildChannels.allowed.includes(channelId);
    }
    
    // Otherwise check if this channel is specifically ignored
    if (Array.isArray(guildChannels.ignored) && guildChannels.ignored.length > 0) {
      return guildChannels.ignored.includes(channelId);
    }
  }
  
  return false;
};

function Row({
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
  config, // Pass config as prop,
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
}) {
  const isOpen = expanded === server.id;
  const currentTab = serverTabs[server.id] || 0;
  
  // Get pagination state for this specific server
  const currentRelationshipPage = relationshipPages[server.id] || 0;
  const currentRelationshipRowsPerPage = relationshipRowsPerPage[server.id] || 10;
  const currentChannelPage = channelPages[server.id] || 0;
  const currentChannelRowsPerPage = channelRowsPerPage[server.id] || 10;

  const handleTabChange = (event, newValue) => {
    onTabChange(server.id, newValue);
  };

  const handleRelationshipsPageChange = (event, newPage) => {
    setRelationshipPages(prev => ({ ...prev, [server.id]: newPage }));
  };

  const handleRelationshipsRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRelationshipRowsPerPage(prev => ({ ...prev, [server.id]: newRowsPerPage }));
    setRelationshipPages(prev => ({ ...prev, [server.id]: 0 })); // Reset to first page
  };

  const handleChannelsPageChange = (event, newPage) => {
    setChannelPages(prev => ({ ...prev, [server.id]: newPage }));
  };

  const handleChannelsRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setChannelRowsPerPage(prev => ({ ...prev, [server.id]: newRowsPerPage }));
    setChannelPages(prev => ({ ...prev, [server.id]: 0 })); // Reset to first page
  };

  return (
    <>
      <TableRow 
        sx={{ 
          "& > *": { borderBottom: "unset" },
          cursor: "pointer",
          "&:hover": { backgroundColor: "action.hover" }
        }}
        onClick={() => onExpand(server.id)}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the row click
              onExpand(server.id);
            }}
          >
            {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar src={server.iconURL} alt={server.name} variant="rounded" imgProps={{ loading: 'lazy' }} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {server.name}
              </Typography>
              {server.memberCount && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <PeopleIcon sx={{ fontSize: 12 }} /> {server.memberCount - 1}{" "}
                  {server.memberCount - 1 === 1 ? "member" : "members"}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell align="right">
          {server.joinedAt
            ? new Date(server.joinedAt).toLocaleDateString()
            : "Unknown"}
        </TableCell>
        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => onLeave(server.id)}
          >
            Leave
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2, minHeight: 32, '& .MuiTab-root': { minHeight: 32, minWidth: 120 } }}>
                <Tab icon={<PeopleIcon />} iconPosition="start" label="User Relationships" />
                <Tab icon={<ForumIcon />} iconPosition="start" label="Channel Monitoring" />
              </Tabs>
              
              {/* User Relationships Tab Panel */}
              <Box hidden={currentTab !== 0}>
                {loadingRelationships[server.id] ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ ml: 2, alignSelf: "center" }}>
                      Loading relationships...
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {relationships[server.id] && Object.keys(relationships[server.id]).length > 0 ? (
                      <>
                        <Table size="small" aria-label="purchases">
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
                            {Object.entries(relationships[server.id])
                              .slice(currentRelationshipPage * currentRelationshipRowsPerPage, currentRelationshipPage * currentRelationshipRowsPerPage + currentRelationshipRowsPerPage)
                              .map(([userId, data]) => (
                                <TableRow key={userId}>
                                  <TableCell component="th" scope="row">
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      <Avatar
                                        src={data.avatarUrl}
                                        alt={data.displayName || data.username}
                                        sx={{ width: 32, height: 32 }}
                                        imgProps={{ loading: 'lazy' }}
                                      />
                                      <Box
                                        sx={{
                                          display: "flex",
                                          flexDirection: "column",
                                        }}
                                      >
                                        <Typography variant="body2" fontWeight="medium">
                                          {data.displayName || data.username || userId}
                                        </Typography>
                                        {data.username &&
                                          data.username !== data.displayName && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
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
                                      sx={{ height: 20, fontSize: "0.7rem" }}
                                    />
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      maxWidth: 200,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    <Tooltip title={data.behavior.join(", ")}>
                                      <Typography variant="body2" noWrap>
                                        {data.behavior.join(", ") || "None"}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Checkbox
                                      checked={data.ignored || false}
                                      onChange={() =>
                                        onIgnoreToggle(server.id, userId, data)
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      onClick={() => onEditUser(userId, data)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                        <TablePagination
                          rowsPerPageOptions={[10, 20, 50]}
                          component="div"
                          count={Object.keys(relationships[server.id] || {}).length}
                          rowsPerPage={currentRelationshipRowsPerPage}
                          page={currentRelationshipPage}
                          onPageChange={handleRelationshipsPageChange}
                          onRowsPerPageChange={handleRelationshipsRowsPerPageChange}
                        />
                      </>
                    ) : relationships[server.id] ? ( // Only show "no relationships" if relationships object exists but is empty
                      <Alert severity="info" sx={{ mt: 1 }}>
                        No user relationships found for this server yet.
                      </Alert>
                    ) : ( // If relationships object doesn't exist yet, show nothing or loading
                      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ ml: 2, alignSelf: "center" }}>
                          Loading relationships...
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>

              {/* Channel Monitoring Tab Panel */}
              <Box hidden={currentTab !== 1}>
                {loadingChannels[server.id] ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ ml: 2, alignSelf: "center" }}>
                      Loading channels...
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {channels[server.id] && channels[server.id].length > 0 ? (
                      <>
                        <Table size="small" aria-label="channels">
                          <TableHead>
                            <TableRow>
                              <TableCell>Channel Name</TableCell>
                              <TableCell align="center">Monitored</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {channels[server.id]
                              .slice(currentChannelPage * currentChannelRowsPerPage, currentChannelPage * currentChannelRowsPerPage + currentChannelRowsPerPage)
                              .map((channel) => (
                                <TableRow key={channel.id}>
                                  <TableCell component="th" scope="row">
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography variant="body2" fontWeight="medium">
                                        #{channel.name}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Checkbox
                                      checked={!isChannelIgnored(config, server.id, channel.id)} // Check if channel is NOT ignored
                                      onChange={() => onChannelToggle(server.id, channel.id)}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                        <TablePagination
                          rowsPerPageOptions={[10, 20, 50]}
                          component="div"
                          count={channels[server.id]?.length || 0}
                          rowsPerPage={currentChannelRowsPerPage}
                          page={currentChannelPage}
                          onPageChange={handleChannelsPageChange}
                          onRowsPerPageChange={handleChannelsRowsPerPageChange}
                        />
                      </>
                    ) : channels[server.id] ? ( // Only show "no channels" if channels array exists but is empty
                      <Alert severity="info" sx={{ mt: 1 }}>
                        No channels found for this server yet.
                      </Alert>
                    ) : ( // If channels array doesn't exist yet, show loading
                      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ ml: 2, alignSelf: "center" }}>
                          Loading channels...
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function Servers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [expandedServerId, setExpandedServerId] = useState(null);
  const [relationships, setRelationships] = useState({});
  const [loadingRelationships, setLoadingRelationships] = useState({});
  const [channels, setChannels] = useState({});
  const [loadingChannels, setLoadingChannels] = useState({});
  const [config, setConfig] = useState(null); // Store the bot configuration
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState(null);
  const [serverTabs, setServerTabs] = useState({}); // Track tab state per server
  const [relationshipPages, setRelationshipPages] = useState({}); // Track pagination per server
  const [relationshipRowsPerPage, setRelationshipRowsPerPage] = useState({}); // Track rows per page per server
  const [channelPages, setChannelPages] = useState({}); // Track pagination per server
  const [channelRowsPerPage, setChannelRowsPerPage] = useState({}); // Track rows per page per server

  // Fetch the current bot configuration
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get("/api/config");
      setConfig(response.data);
    } catch (err) {
      console.error("Failed to fetch config:", err);
    }
  };

  useEffect(() => {
    fetchServers();
    fetchBotInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/servers");
      setServers(response.data);
      
      // Auto-expand if only one server
      if (response.data.length === 1) {
        const serverId = response.data[0].id;
        setExpandedServerId(serverId);
        // We need to fetch relationships and channels for the auto-expanded server
        // But we need to do it after state updates, or just call them directly here
        // Since toggleExpand does both setting ID and fetching, we can replicate that logic
        // or rely on a useEffect to fetch when expandedServerId changes.
        // Let's call the fetchers directly to be safe and immediate.
        fetchRelationships(serverId);
        fetchChannels(serverId);
      }
      
      setError(null);
    } catch (err) {
      console.error("Failed to fetch servers:", err);
      setError("Failed to load server data");
    } finally {
      setLoading(false);
    }
  };

  const fetchBotInfo = async () => {
    try {
      const response = await axios.get("/api/bot-info");
      setBotInfo(response.data);
    } catch (err) {
      console.error("Failed to fetch bot info:", err);
    }
  };

  const fetchRelationships = async (guildId) => {
    // Only fetch if not currently loading
    if (loadingRelationships[guildId]) return;

    console.log(`Fetching relationships for guild ${guildId}`);
    setLoadingRelationships((prev) => ({ ...prev, [guildId]: true }));
    
    // Set a timeout to ensure loading state is reset even if API call hangs
    const timeoutId = setTimeout(() => {
      console.log(`Timeout: Setting loading to false for relationships guild ${guildId}`);
      setLoadingRelationships((prev) => ({ ...prev, [guildId]: false }));
    }, 10000); // 10 second timeout
    
    try {
      const res = await axios.get(`/api/guilds/${guildId}/relationships`);
      console.log(`Fetched relationships for guild ${guildId}:`, res.data);
      setRelationships((prev) => ({ ...prev, [guildId]: res.data }));
    } catch (err) {
      console.error(`Failed to fetch relationships for guild ${guildId}`, err);
      // Still set the relationships to an empty object on error to stop loading state
      setRelationships((prev) => ({ ...prev, [guildId]: {} }));
    } finally {
      clearTimeout(timeoutId);
      console.log(`Setting loading to false for relationships guild ${guildId}`);
      setLoadingRelationships((prev) => ({ ...prev, [guildId]: false }));
    }
  };

  const fetchChannels = async (guildId) => {
    // Only fetch if not currently loading
    if (loadingChannels[guildId]) return;

    console.log(`Fetching channels for guild ${guildId}`);
    setLoadingChannels((prev) => ({ ...prev, [guildId]: true }));
    
    // Set a timeout to ensure loading state is reset even if API call hangs
    const timeoutId = setTimeout(() => {
      console.log(`Timeout: Setting loading to false for channels guild ${guildId}`);
      setLoadingChannels((prev) => ({ ...prev, [guildId]: false }));
    }, 10000); // 10 second timeout
    
    try {
      const res = await axios.get(`/api/guilds/${guildId}/channels`);
      console.log(`Fetched channels for guild ${guildId}:`, res.data);
      setChannels((prev) => ({ ...prev, [guildId]: res.data }));
    } catch (err) {
      console.error(`Failed to fetch channels for guild ${guildId}`, err);
      // Still set the channels to an empty array on error to stop loading state
      setChannels((prev) => ({ ...prev, [guildId]: [] }));
    } finally {
      clearTimeout(timeoutId);
      console.log(`Setting loading to false for channels guild ${guildId}`);
      setLoadingChannels((prev) => ({ ...prev, [guildId]: false }));
    }
  };

  const toggleExpand = (guildId) => {
    if (expandedServerId === guildId) {
      setExpandedServerId(null);
    } else {
      setExpandedServerId(guildId);
      // Reset tab to first when expanding a new server
      setServerTabs(prev => ({ ...prev, [guildId]: 0 }));
      // Pre-fetch relationships when expanding to avoid initial loading state
      if (!relationships[guildId] && !loadingRelationships[guildId]) {
        fetchRelationships(guildId);
      }
      if (!channels[guildId] && !loadingChannels[guildId]) {
        fetchChannels(guildId);
      }
    }
  };

  const handleLeaveServer = async (serverId) => {
    if (
      window.confirm(
        `Are you sure you want to remove the bot from server "${servers.find((s) => s.id === serverId)?.name}"?`,
      )
    ) {
      try {
        await axios.delete(`/api/servers/${serverId}`);
        fetchServers();
      } catch (err) {
        console.error("Failed to leave server:", err);
        alert("Failed to remove bot from server");
      }
    }
  };

  const startEdit = (userId, data) => {
    setEditingUser(userId);
    setEditData({ ...data });
  };

  const handleSaveRelationship = async () => {
    if (!expandedServerId || !editingUser) return;

    try {
      await axios.post(
        `/api/guilds/${expandedServerId}/relationships/${editingUser}`,
        editData,
      );

      setRelationships((prev) => ({
        ...prev,
        [expandedServerId]: {
          ...prev[expandedServerId],
          [editingUser]: editData,
        },
      }));

      setEditingUser(null);
    } catch (err) {
      console.error("Failed to save relationship", err);
      alert("Failed to save relationship changes");
    }
  };

  const handleIgnoreToggle = async (guildId, userId, currentData) => {
    const newData = { ...currentData, ignored: !currentData.ignored };
    try {
      await axios.post(
        `/api/guilds/${guildId}/relationships/${userId}`,
        newData,
      );
      setRelationships((prev) => ({
        ...prev,
        [guildId]: {
          ...prev[guildId],
          [userId]: newData,
        },
      }));
    } catch (err) {
      console.error("Failed to toggle ignore status", err);
    }
  };

  const handleTabChange = (guildId, tabIndex) => {
    setServerTabs(prev => ({ ...prev, [guildId]: tabIndex }));
    
    // Fetch data only when the tab is selected, data hasn't been loaded yet, and not currently loading
    if (tabIndex === 0 && !relationships[guildId] && !loadingRelationships[guildId]) {
      // Fetch relationships if not loaded yet and not currently loading
      fetchRelationships(guildId);
    } else if (tabIndex === 1 && !channels[guildId] && !loadingChannels[guildId]) {
      // Fetch channels if not loaded yet and not currently loading
      fetchChannels(guildId);
    }
  };

  const handleChannelToggle = async (guildId, channelId) => {
    if (!config) {
      console.error("Config not loaded yet");
      return;
    }

    // Create a copy of the current config to modify
    const updatedConfig = JSON.parse(JSON.stringify(config));

    // Initialize guild-specific channels if not present
    if (!updatedConfig.replyBehavior.guildSpecificChannels) {
      updatedConfig.replyBehavior.guildSpecificChannels = {};
    }

    if (!updatedConfig.replyBehavior.guildSpecificChannels[guildId]) {
      updatedConfig.replyBehavior.guildSpecificChannels[guildId] = {
        allowed: [],
        ignored: []
      };
    }

    const guildChannels = updatedConfig.replyBehavior.guildSpecificChannels[guildId];

    // Determine if the channel is currently monitored (not ignored)
    const isCurrentlyMonitored = !isChannelIgnored(config, guildId, channelId);

    // Toggle the channel status
    if (isCurrentlyMonitored) {
      // Currently monitored, so add to ignored list
      if (guildChannels.allowed && guildChannels.allowed.length > 0) {
        // If using allowed list, remove from allowed
        guildChannels.allowed = guildChannels.allowed.filter(id => id !== channelId);
      } else {
        // If using ignored list, add to ignored
        if (!guildChannels.ignored) guildChannels.ignored = [];
        if (!guildChannels.ignored.includes(channelId)) {
          guildChannels.ignored.push(channelId);
        }
      }
    } else {
      // Currently ignored, so remove from ignored list
      if (guildChannels.ignored) {
        guildChannels.ignored = guildChannels.ignored.filter(id => id !== channelId);
      }

      // If using allowed list, add to allowed
      if (guildChannels.allowed && Array.isArray(guildChannels.allowed)) {
        if (!guildChannels.allowed.includes(channelId)) {
          guildChannels.allowed.push(channelId);
        }
      }
    }

    try {
      // Update the configuration via API
      await axios.post("/api/config", updatedConfig);

      // Update local state
      setConfig(updatedConfig);

      // Refresh the server data to reflect changes
      fetchServers();
    } catch (err) {
      console.error("Failed to update channel monitoring settings", err);
      alert("Failed to update channel monitoring settings");
    }
  };



  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, width: "100%" }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: "100%", p: 2}}>
      {servers.length === 0 ? (
        <Alert severity="info">The bot is not in any servers.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={2}
          sx={{ borderRadius: 2 }}
        >
          <Table aria-label="collapsible table">
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell>Server Name</TableCell>
                <TableCell align="right">Join Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {servers.map((server) => (
                <Row
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
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Invite Bot Button moved under main content and right justified */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
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

      {/* Edit Modal */}
      <Dialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Edit Relationship</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <TextField
              label="Attitude"
              value={editData?.attitude || ""}
              onChange={(e) =>
                setEditData({ ...editData, attitude: e.target.value })
              }
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Behaviors (comma separated)"
              value={editData?.behavior?.join(", ") || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  behavior: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              helperText="Specific behaviors for this user"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editData?.ignored || false}
                  onChange={(e) =>
                    setEditData({ ...editData, ignored: e.target.checked })
                  }
                  color="primary"
                />
              }
              label="Ignore this user"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditingUser(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveRelationship}
            variant="contained"
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Servers;
