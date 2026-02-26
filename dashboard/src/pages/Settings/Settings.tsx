/**
 * Settings page for configuring bot persona, LLM, memory, and logging.
 * @module pages/Settings/Settings
 */
import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Api as LLMIcon,
  Storage as StorageIcon,
  Visibility as VisibilityIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';

import { useGlobalConfig, useSocket } from '@hooks';

/**
 * Settings page component for global bot configuration.
 * @returns Rendered settings page
 */
function Settings() {
  const {
    config,
    models,
    loading,
    saving,
    isFetchingModels,
    message,
    updateNested,
    addArrayItem,
    removeArrayItem,
    updateArrayItem,
    fetchModels,
    getCachedModels,
    applyCachedModels,
    clearMessage,
    refetch,
  } = useGlobalConfig();

  const { isRestarting } = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const [activeSpeakingSection, setActiveSpeakingSection] =
    useState('globalRules');
  const [oauthError, setOauthError] = useState<string | null>(null);

  /**
   * Starts Qwen OAuth in a popup and reloads config when complete.
   */
  const handleConnectQwen = async () => {
    setOauthError(null);
    const popup = window.open('/api/llm/qwen/oauth/start', 'qwen-oauth', 'width=700,height=800');
    if (!popup) {
      setOauthError('Popup was blocked. Please allow popups and try again.');
      return;
    }

    try {
      const response = await fetch('/api/llm/qwen/oauth/start');
      const data = await response.json();
      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to start Qwen OAuth flow');
      }
      popup.location.href = data.authUrl;
    } catch (err) {
      popup.close();
      const message = err instanceof Error ? err.message : 'Failed to start Qwen OAuth flow';
      setOauthError(message);
      console.error(err);
      return;
    }

    const onMessage = async (event: MessageEvent) => {
      const msg = event.data as { type?: string };
      if (!msg || (msg.type !== 'qwen-oauth-success' && msg.type !== 'qwen-oauth-error')) {
        return;
      }

      window.removeEventListener('message', onMessage);
      if (msg.type === 'qwen-oauth-success') {
        await refetch();
        await fetchModels('qwen');
      } else {
        setOauthError('Qwen OAuth failed. Check backend logs and OAuth app redirect/client settings.');
      }
    };

    window.addEventListener('message', onMessage);
  };

  /**
   * Handles tab selection change.
   * @param event - Tab change event
   * @param newValue - New tab index
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  /**
   * Handles accordion section expansion change.
   * @param section - Section identifier
   */
  const handleSpeakingSectionChange = (section) => {
    setActiveSpeakingSection(section);
  };

  /**
   * Handles provider change and fetches models for the selected provider.
   * @param event - Select change event
   */
  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    updateNested('llm.provider', newProvider, isRestarting);
  };


  const fetchedModelProvidersRef = useRef(new Set<string>());

  useEffect(() => {
    if (!config || activeTab !== 1) {
      return;
    }

    const provider = config.llm.provider;
    if (fetchedModelProvidersRef.current.has(provider)) {
      const cachedModels = getCachedModels(provider);
      applyCachedModels(provider);

      if (cachedModels.length === 0) {
        fetchedModelProvidersRef.current.delete(provider);
      }
      return;
    }

    let isCancelled = false;
    const loadProviderModels = async () => {
      const fetchedModels = await fetchModels(provider);
      if (isCancelled) {
        return;
      }

      fetchedModelProvidersRef.current.add(provider);

      if (!fetchedModels || fetchedModels.length === 0) {
        if (provider === 'ollama') {
          updateNested('llm.ollamaModel', '', isRestarting);
        }
        return;
      }

      if (provider === 'gemini') {
        const currentModel = config.llm.geminiModel;
        const nextModel = fetchedModels.includes(currentModel) ? currentModel : fetchedModels[0];
        if (nextModel !== currentModel) {
          updateNested('llm.geminiModel', nextModel, isRestarting);
        }
        return;
      }

      if (provider === 'ollama') {
        const currentModel = config.llm.ollamaModel;
        const nextModel = fetchedModels.includes(currentModel) ? currentModel : fetchedModels[0];
        if (nextModel !== currentModel) {
          updateNested('llm.ollamaModel', nextModel, isRestarting);
        }
        return;
      }

      if (provider === 'qwen') {
        const currentModel = config.llm.qwenModel;
        const nextModel = fetchedModels.includes(currentModel) ? currentModel : fetchedModels[0];
        if (nextModel !== currentModel) {
          updateNested('llm.qwenModel', nextModel, isRestarting);
        }
      }
    };

    loadProviderModels();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, applyCachedModels, config, fetchModels, getCachedModels, isRestarting, updateNested]);


  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );

  if (!config)
    return <Alert severity="error">Failed to load configuration.</Alert>;


  const providerApiKeyPath = config.llm.provider === 'qwen'
    ? 'llm.qwenApiKey'
    : config.llm.provider === 'gemini'
      ? 'llm.geminiApiKey'
      : 'llm.ollamaApiKey';

  const providerApiKeyValue = config.llm.provider === 'qwen'
    ? config.llm.qwenApiKey
    : config.llm.provider === 'gemini'
      ? config.llm.geminiApiKey
      : config.llm.ollamaApiKey;

  const providerApiKeyLockedByEnv = config.llm.provider === 'qwen'
    ? !!config.llm.qwenApiKeyFromEnv
    : config.llm.provider === 'gemini'
      ? !!config.llm.geminiApiKeyFromEnv
      : !!config.llm.ollamaApiKeyFromEnv;

  const providerApiKeyLabel = config.llm.provider === 'qwen'
    ? 'Qwen API Key'
    : config.llm.provider === 'gemini'
      ? 'Gemini API Key'
      : 'Ollama API Key (optional)';

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        {(saving || isRestarting) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="textSecondary">
              {isRestarting ? 'Bot restarting...' : 'Saving...'}
            </Typography>
          </Box>
        )}
      </Box>

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
          role="tablist"
          aria-label="Settings tabs"
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" />
                <span>Bot Persona</span>
              </Box>
            }
            id="persona-tab"
            aria-controls="persona-panel"
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LLMIcon fontSize="small" />
                <span>LLM</span>
              </Box>
            }
            id="llm-tab"
            aria-controls="llm-panel"
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon fontSize="small" />
                <span>Memory</span>
              </Box>
            }
            id="memory-tab"
            aria-controls="memory-panel"
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon fontSize="small" />
                <span>Logger</span>
              </Box>
            }
            id="logger-tab"
            aria-controls="logger-panel"
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Bot Persona Tab */}
          {activeTab === 0 && (
            <>
              <Typography
                variant="h6"
                gutterBottom
                component="div"
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                  mb: 2,
                }}
                id="persona-panel"
                role="tabpanel"
              >
                Bot Persona
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Global Username"
                    helperText="The default username/persona name used in prompts"
                    value={config.botPersona.username}
                    onChange={(e) => updateNested('botPersona.username', e.target.value, isRestarting)}
                    variant="outlined"
                    disabled={isRestarting}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Default Persona Description"
                    helperText="Baseline description for new servers"
                    multiline
                    rows={3}
                    value={config.botPersona.description}
                    onChange={(e) => updateNested('botPersona.description', e.target.value, isRestarting)}
                    variant="outlined"
                    disabled={isRestarting}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Accordion
                      expanded={activeSpeakingSection === 'globalRules'}
                      onChange={() => handleSpeakingSectionChange('globalRules')}
                      sx={{
                        '&.Mui-expanded': {
                          margin: 0,
                        },
                        '&:before': {
                          display: 'none',
                        },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<KeyboardArrowDownIcon />}
                        sx={{
                          pl: 2,
                          pr: 2,
                          backgroundColor: 'secondary.main',
                          color: 'secondary.contrastText',
                          borderRadius: 1,
                          '&.Mui-expanded': {
                            borderRadius: '8px 8px 0 0',
                          },
                        }}
                        aria-controls="global-rules-content"
                        id="global-rules-header"
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GavelIcon fontSize="small" />
                          <Typography variant="subtitle2" color="inherit">
                            Global Rules
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails
                        sx={{ pl: 2, pr: 2, pt: 2, pb: 2 }}
                        id="global-rules-content"
                      >
                        {config.botPersona.globalRules.map((rule, index) => (
                          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <TextField
                              fullWidth
                              size="small"
                              value={rule}
                              onChange={(e) =>
                                updateArrayItem('botPersona.globalRules', index, e.target.value, isRestarting)
                              }
                              variant="outlined"
                              disabled={isRestarting}
                            />
                            <IconButton
                              color="error"
                              onClick={() => removeArrayItem('botPersona.globalRules', index)}
                              disabled={isRestarting}
                              aria-label={`Remove rule ${index + 1}`}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        ))}
                        <Button
                          startIcon={<AddIcon />}
                          size="small"
                          onClick={() => addArrayItem('botPersona.globalRules')}
                          disabled={isRestarting}
                          aria-label="Add new rule"
                        >
                          Add Rule
                        </Button>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                </Grid>
              </Grid>
            </>
          )}

          {/* API Settings Tab */}
          {activeTab === 1 && (
            <>
              <Typography
                variant="h6"
                gutterBottom
                component="div"
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                  mb: 2,
                }}
                id="llm-panel"
                role="tabpanel"
              >
                LLM Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Provider</InputLabel>
                    <Select
                      value={config.llm.provider || 'gemini'}
                      label="Provider"
                      onChange={handleProviderChange}
                      disabled={isRestarting}
                    >
                      <MenuItem value="gemini">Google Gemini</MenuItem>
                      <MenuItem value="ollama">Ollama (Local)</MenuItem>
                      <MenuItem value="qwen">Qwen</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth disabled={isFetchingModels || isRestarting}>
                    <InputLabel>{config.llm.provider === 'ollama' ? 'Ollama Model' : config.llm.provider === 'qwen' ? 'Qwen Model' : 'Gemini Model'}</InputLabel>
                    <Select
                      value={
                        models.includes(
                          config.llm.provider === 'ollama'
                            ? config.llm.ollamaModel
                            : config.llm.provider === 'qwen'
                              ? config.llm.qwenModel
                              : config.llm.geminiModel
                        )
                          ? (config.llm.provider === 'ollama'
                              ? config.llm.ollamaModel
                              : config.llm.provider === 'qwen'
                                ? config.llm.qwenModel
                                : config.llm.geminiModel)
                          : ''
                      }
                      label={config.llm.provider === 'ollama' ? 'Ollama Model' : config.llm.provider === 'qwen' ? 'Qwen Model' : 'Gemini Model'}
                      onChange={(e) => updateNested(
                        config.llm.provider === 'ollama'
                          ? 'llm.ollamaModel'
                          : config.llm.provider === 'qwen'
                            ? 'llm.qwenModel'
                            : 'llm.geminiModel',
                        e.target.value,
                        isRestarting
                      )}
                    >
                      {isFetchingModels ? (
                        <MenuItem value="">
                          <CircularProgress size={20} />
                        </MenuItem>
                      ) : models.length === 0 ? (
                        <MenuItem value="" disabled>
                          No models available
                        </MenuItem>
                      ) : (
                        models.map((m) => (
                          <MenuItem key={m} value={m}>
                            {m}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      type="password"
                      label={providerApiKeyLabel}
                      value={providerApiKeyValue}
                      onChange={(e) => updateNested(providerApiKeyPath, e.target.value, isRestarting)}
                      variant="outlined"
                      disabled={isRestarting || providerApiKeyLockedByEnv}
                      helperText={providerApiKeyLockedByEnv ? 'Managed by .env and cannot be overridden in dashboard.' : ''}
                    />
                    {config.llm.provider === 'qwen' && (
                      <Button variant="outlined" onClick={handleConnectQwen} disabled={isRestarting || providerApiKeyLockedByEnv}>
                        Connect OAuth
                      </Button>
                    )}
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Request Settings
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Retry Attempts"
                    value={config.llm.retryAttempts}
                    onChange={(e) => updateNested('llm.retryAttempts', parseInt(e.target.value), isRestarting)}
                    variant="outlined"
                    disabled={isRestarting}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Retry Backoff (ms)"
                    value={config.llm.retryBackoffMs}
                    onChange={(e) => updateNested('llm.retryBackoffMs', parseInt(e.target.value), isRestarting)}
                    variant="outlined"
                    disabled={isRestarting}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* Memory Settings Tab */}
          {activeTab === 2 && (
            <>
              <Typography
                variant="h6"
                gutterBottom
                component="div"
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                  mb: 2,
                }}
                id="memory-panel"
                role="tabpanel"
              >
                Memory Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Memory (Messages)"
                    value={config.memory.maxMessages}
                    onChange={(e) => updateNested('memory.maxMessages', parseInt(e.target.value), isRestarting)}
                    variant="outlined"
                    disabled={isRestarting}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Message Age (Days)"
                    value={config.memory.maxMessageAgeDays}
                    onChange={(e) => updateNested('memory.maxMessageAgeDays', parseInt(e.target.value), isRestarting)}
                    variant="outlined"
                    disabled={isRestarting}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* Logger Settings Tab */}
          {activeTab === 3 && (
            <>
              <Typography
                variant="h6"
                gutterBottom
                component="div"
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                  mb: 2,
                }}
                id="logger-panel"
                role="tabpanel"
              >
                Logger Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Log Lines"
                    value={config.logger.maxLogLines}
                    onChange={(e) => updateNested('logger.maxLogLines', parseInt(e.target.value), isRestarting)}
                    variant="outlined"
                    disabled={isRestarting}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.logger.logReplyDecisions}
                        onChange={(e) => updateNested('logger.logReplyDecisions', e.target.checked, isRestarting)}
                        color="primary"
                        disabled={isRestarting}
                      />
                    }
                    label="Log Reply Decisions"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.logger.logSql}
                        onChange={(e) => updateNested('logger.logSql', e.target.checked, isRestarting)}
                        color="primary"
                        disabled={isRestarting}
                      />
                    }
                    label="Log SQL Queries"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={clearMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={message.severity}
          variant="filled"
          onClose={clearMessage}
        >
          {message.text}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!oauthError}
        autoHideDuration={6000}
        onClose={() => setOauthError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setOauthError(null)} severity="error" sx={{ width: '100%' }}>
          {oauthError}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Settings;
