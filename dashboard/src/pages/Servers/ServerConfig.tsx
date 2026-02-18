/**
 * Server-specific configuration component.
 * @module pages/Servers/ServerConfig
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Forum as ForumIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Cached as CachedIcon,
} from '@mui/icons-material';

import {
  updateNestedProperty,
  addToArrayProperty,
  removeArrayItemByIndex,
  updateArrayItemByIndex,
} from '@utils';

/**
 * Props for ServerConfig component.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ServerConfigProps {
  /** Guild ID of the server */
  guildId: string;
  /** Server-specific configuration */
  config: Record<string, unknown>;
  /** Whether config is loading */
  loading: boolean;
  /** Whether config is being saved */
  saving: boolean;
  /** Whether bot is restarting */
  isRestarting: boolean;
  /** Callback when config is updated */
  onUpdate: (guildId: string, config: Record<string, unknown>) => void;
  /** Callback when config is reset to default */
  onReset: (guildId: string) => void;
}

/**
 * Server configuration form with persona and reply behavior settings.
 * @param props - Component props
 * @returns Rendered server config form
 */
function ServerConfig({
  guildId,
  config,
  loading,
  saving,
  isRestarting,
  onUpdate,
  onReset,
}) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleUpdate = (path, value) => {
    const updated = updateNestedProperty(localConfig, path, value);
    setLocalConfig(updated);
    onUpdate(guildId, updated);
  };

  const addArrayItem = (path, item = '') => {
    const updated = addToArrayProperty(localConfig, path, item);
    setLocalConfig(updated);
    onUpdate(guildId, updated);
  };

  const removeArrayItem = (path, index) => {
    const updated = removeArrayItemByIndex(localConfig, path, index);
    setLocalConfig(updated);
    onUpdate(guildId, updated);
  };

  const updateArrayItem = (path, index, value) => {
    const updated = updateArrayItemByIndex(localConfig, path, index, value);
    setLocalConfig(updated);
    onUpdate(guildId, updated);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading configuration...
        </Typography>
      </Box>
    );
  }

  if (!config) {
    return <Alert severity="info">No configuration found.</Alert>;
  }

  return (
    <Box sx={{ p: 1 }}>
      {saving && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          startIcon={<CachedIcon />}
          onClick={() => onReset(guildId)}
          disabled={isRestarting}
          aria-label="Reset configuration to default"
        >
          Reset to Default
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Bot Persona Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PeopleIcon fontSize="small" /> Server-Specific Persona
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Typography variant="caption" fontWeight="bold">
                Speaking Style
              </Typography>
              
              {localConfig.bot.speakingStyle.map((style, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={style}
                    onChange={(e) =>
                      updateArrayItem('bot.speakingStyle', idx, e.target.value)
                    }
                    disabled={isRestarting}
                    aria-label={`Speaking style ${idx + 1}`}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeArrayItem('bot.speakingStyle', idx)}
                    disabled={isRestarting}
                    aria-label={`Remove speaking style ${idx + 1}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addArrayItem('bot.speakingStyle')}
                disabled={isRestarting}
                aria-label="Add speaking style"
              >
                Add Style
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Reply Behavior Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <ForumIcon fontSize="small" /> Reply Behavior
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode</InputLabel>
                <Select
                  value={localConfig.replyBehavior.mode}
                  label="Mode"
                  onChange={(e) => handleUpdate('replyBehavior.mode', e.target.value)}
                  disabled={isRestarting}
                >
                  <MenuItem value="mention-only">Mention Only</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="passive">Passive</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ px: 1 }}>
                <Typography variant="caption">
                  Reply Probability:{' '}
                  {(localConfig.replyBehavior.replyProbability * 100).toFixed(0)}%
                </Typography>
                <Slider
                  size="small"
                  value={localConfig.replyBehavior.replyProbability}
                  min={0}
                  max={1}
                  step={0.1}
                  onChange={(e, val) => handleUpdate('replyBehavior.replyProbability', val)}
                  disabled={isRestarting}
                  aria-label="Reply probability"
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={localConfig.replyBehavior.requireMention}
                    onChange={(e) => handleUpdate('replyBehavior.requireMention', e.target.checked)}
                    disabled={isRestarting}
                  />
                }
                label={
                  <Typography variant="caption">Require Mention</Typography>
                }
              />

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Min Delay (ms)"
                value={localConfig.replyBehavior.minDelayMs}
                onChange={(e) => handleUpdate('replyBehavior.minDelayMs', parseInt(e.target.value))}
                disabled={isRestarting}
              />

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Max Delay (ms)"
                value={localConfig.replyBehavior.maxDelayMs}
                onChange={(e) => handleUpdate('replyBehavior.maxDelayMs', parseInt(e.target.value))}
                disabled={isRestarting}
              />

              <FormControl fullWidth size="small">
                <InputLabel>Engagement Mode</InputLabel>
                <Select
                  value={localConfig.replyBehavior.engagementMode}
                  label="Engagement Mode"
                  onChange={(e) => handleUpdate('replyBehavior.engagementMode', e.target.value)}
                  disabled={isRestarting}
                >
                  <MenuItem value="passive">Passive</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ px: 1 }}>
                <Typography variant="caption">
                  Proactive Reply Chance:{' '}
                  {(localConfig.replyBehavior.proactiveReplyChance * 100).toFixed(0)}%
                </Typography>
                <Slider
                  size="small"
                  value={localConfig.replyBehavior.proactiveReplyChance}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(e, val) => handleUpdate('replyBehavior.proactiveReplyChance', val)}
                  disabled={isRestarting}
                  aria-label="Proactive reply chance"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ServerConfig;
