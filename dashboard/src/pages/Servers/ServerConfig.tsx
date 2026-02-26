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
import type { ServerConfig as DashboardServerConfig } from '@types';

interface ServerConfigProps {
  guildId: string;
  config: DashboardServerConfig;
  loading: boolean;
  saving: boolean;
  isRestarting: boolean;
  onUpdate: (guildId: string, config: DashboardServerConfig) => void;
  onReset: (guildId: string) => void;
}

function ServerConfig({
  guildId,
  config,
  loading,
  saving,
  isRestarting,
  onUpdate,
  onReset,
}: ServerConfigProps) {
  const [localConfig, setLocalConfig] = useState<DashboardServerConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleUpdate = (path: string, value: unknown) => {
    const updated = updateNestedProperty(localConfig as unknown as Record<string, unknown>, path, value) as unknown as DashboardServerConfig;
    setLocalConfig(updated);
    onUpdate(guildId, updated);
  };

  const addArrayItem = (path: string, item = '') => {
    const updated = addToArrayProperty(localConfig as unknown as Record<string, unknown>, path, item) as unknown as DashboardServerConfig;
    setLocalConfig(updated);
    onUpdate(guildId, updated);
  };

  const removeArrayItem = (path: string, index: number) => {
    const updated = removeArrayItemByIndex(localConfig as unknown as Record<string, unknown>, path, index) as unknown as DashboardServerConfig;
    setLocalConfig(updated);
    onUpdate(guildId, updated);
  };

  const updateArrayItem = (path: string, index: number, value: unknown) => {
    const updated = updateArrayItemByIndex(localConfig as unknown as Record<string, unknown>, path, index, value) as unknown as DashboardServerConfig;
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PeopleIcon fontSize="small" /> Server Persona
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Nickname Override (Optional)"
                helperText="If set, this name is used for this server instead of global username"
                value={localConfig.nickname ?? ''}
                onChange={(e) => handleUpdate('nickname', e.target.value)}
                disabled={isRestarting}
              />

              <Typography variant="caption" fontWeight="bold">
                Speaking Style
              </Typography>

              {(localConfig.speakingStyle ?? []).map((style: string, idx: number) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={style}
                    onChange={(e) =>
                      updateArrayItem('speakingStyle', idx, e.target.value)
                    }
                    disabled={isRestarting}
                    aria-label={`Speaking style ${idx + 1}`}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeArrayItem('speakingStyle', idx)}
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
                onClick={() => addArrayItem('speakingStyle')}
                disabled={isRestarting}
                aria-label="Add speaking style"
              >
                Add Style
              </Button>
            </Box>
          </Paper>
        </Grid>

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
              <Box sx={{ px: 1 }}>
                <Typography variant="caption">
                  Reply Probability:{' '}
                  {((localConfig.replyBehavior?.replyProbability ?? 1) * 100).toFixed(0)}%
                </Typography>
                <Slider
                  size="small"
                  value={localConfig.replyBehavior?.replyProbability ?? 1}
                  min={0}
                  max={1}
                  step={0.1}
                  onChange={(_e, val) => handleUpdate('replyBehavior.replyProbability', val)}
                  disabled={isRestarting}
                  aria-label="Reply probability"
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={localConfig.replyBehavior?.mentionOnly ?? true}
                    onChange={(e) => handleUpdate('replyBehavior.mentionOnly', e.target.checked)}
                    disabled={isRestarting}
                  />
                }
                label={
                  <Typography variant="caption">Mention Only</Typography>
                }
              />

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Min Delay (ms)"
                value={localConfig.replyBehavior?.minDelayMs ?? 500}
                onChange={(e) => handleUpdate('replyBehavior.minDelayMs', parseInt(e.target.value, 10) || 0)}
                disabled={isRestarting}
              />

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Max Delay (ms)"
                value={localConfig.replyBehavior?.maxDelayMs ?? 3000}
                onChange={(e) => handleUpdate('replyBehavior.maxDelayMs', parseInt(e.target.value, 10) || 0)}
                disabled={isRestarting}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ServerConfig;
