/**
 * Logs page showing real-time bot logs with filtering.
 * @module pages/Logs/Logs
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Api as ApiIcon,
  Chat as ChatIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import type { SvgIconProps } from '@mui/material';

import { parseLogLine, getLogType, getLevelColor } from '@utils';
import type { LogType, ParsedLog } from '@types';

/**
 * Filter state for log types.
 */
interface Filters {
  ERROR: boolean;
  WARN: boolean;
  INFO: boolean;
  API: boolean;
  MESSAGE: boolean;
  OTHER: boolean;
}

// Map icon names to components
const iconMap: Record<LogType, React.ComponentType<SvgIconProps>> = {
  ERROR: ErrorIcon,
  WARN: WarningIcon,
  API: ApiIcon,
  INFO: InfoIcon,
  MESSAGE: ChatIcon,
  OTHER: VisibilityIcon,
};

/**
 * Logs page component displaying real-time log stream.
 * @returns Rendered logs page
 */
function Logs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    ERROR: true,
    WARN: true,
    INFO: true,
    API: true,
    MESSAGE: true,
    OTHER: true,
  });
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket = io();

    socket.on('logs:init', (initialLogs: string[]) => {
      setLogs(initialLogs.filter((l) => l.trim()));
    });

    socket.on('log', (line: string) => {
      setLogs((prev: string[]) => [...prev.slice(-499), line]); // Keep last 500 lines
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const toggleFilter = useCallback((type: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      const type = getLogType(line);
      return filters[type];
    });
  }, [logs, filters]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const formatJsonForDisplay = (obj: unknown, depth = 0): React.ReactNode => {
    const indent = '\u00A0'.repeat(depth * 4); // Non-breaking space for indentation

    if (typeof obj !== 'object' || obj === null) {
      return (
        <Typography
          component="span"
          sx={{ color: 'text.primary', fontFamily: 'monospace' }}
        >
          {JSON.stringify(obj)}
        </Typography>
      );
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return <Typography component="span">[]</Typography>;

      return (
        <Box component="div" sx={{ ml: 2 }}>
          <Typography component="span" sx={{ color: 'text.secondary' }}>
            [
          </Typography>
          {obj.map((item, index) => (
            <Box key={index} component="div" sx={{ ml: 2 }}>
              <Typography component="span">
                {indent}
                <strong>{index}:</strong>{' '}
              </Typography>
              {formatJsonForDisplay(item, depth + 1)}
              {index < obj.length - 1 && <br />}
            </Box>
          ))}
          <Typography component="span" sx={{ color: 'text.secondary' }}>
            ]
          </Typography>
        </Box>
      );
    }

    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0)
      return <Typography component="span">{{}}</Typography>;

    return (
      <Box component="div" sx={{ ml: 2 }}>
        <Typography component="span" sx={{ color: 'text.secondary' }}>
          {'{'}{' '}
        </Typography>
        {entries.map(([key, value], index) => (
          <Box key={key} component="div" sx={{ ml: 2 }}>
            <Typography component="span">
              {indent}
              <strong>&quot;{key}&quot;</strong>:
            </Typography>{' '}
            {formatJsonForDisplay(value, depth + 1)}
            {index < entries.length - 1 && (
              <Typography component="span">,</Typography>
            )}
            <br />
          </Box>
        ))}
        <Typography component="span" sx={{ color: 'text.secondary' }}>
          {'}'}
        </Typography>
      </Box>
    );
  };

  const getLogIcon = (type: LogType) => {
    const IconComponent = iconMap[type] || iconMap.OTHER;
    return <IconComponent fontSize="small" />;
  };

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Stack 
          direction="row" 
          spacing={1} 
          alignItems="center"
          sx={{ flexWrap: 'wrap', gap: 0.5 }}
        >
          <Chip
            label="ERROR"
            size="small"
            color="error"
            variant={filters.ERROR ? 'filled' : 'outlined'}
            onClick={() => toggleFilter('ERROR')}
            icon={getLogIcon('ERROR')}
          />
          <Chip
            label="WARN"
            size="small"
            color="warning"
            variant={filters.WARN ? 'filled' : 'outlined'}
            onClick={() => toggleFilter('WARN')}
            icon={getLogIcon('WARN')}
          />
          <Chip
            label="API"
            size="small"
            color="info"
            variant={filters.API ? 'filled' : 'outlined'}
            onClick={() => toggleFilter('API')}
            icon={getLogIcon('API')}
          />
          <Chip
            label="INFO"
            size="small"
            color="success"
            variant={filters.INFO ? 'filled' : 'outlined'}
            onClick={() => toggleFilter('INFO')}
            icon={getLogIcon('INFO')}
          />
          <Chip
            label="MSG"
            size="small"
            color="default"
            variant={filters.MESSAGE ? 'filled' : 'outlined'}
            onClick={() => toggleFilter('MESSAGE')}
            icon={getLogIcon('MESSAGE')}
          />
        </Stack>

        <Stack 
          direction="row" 
          spacing={1}
          sx={{ flexShrink: 0 }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                size="small"
                color="primary"
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Auto
              </Typography>
            }
          />
          <Button
            startIcon={<DeleteIcon />}
            size="small"
            onClick={handleClearLogs}
            color="inherit"
            variant="outlined"
            aria-label="Clear logs"
          >
            Clear
          </Button>
        </Stack>
      </Box>

      <Paper
        ref={scrollRef}
        elevation={2}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          bgcolor: '#0a0a0a',
          color: '#f8fafc',
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontSize: '0.7rem',
          height: { xs: 'calc(100vh - 185px)', sm: 'calc(100vh - 140px)' },
          overflowY: 'auto',
        }}
      >
        {filteredLogs.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            {logs.length > 0
              ? 'No logs match current filters.'
              : 'Waiting for logs...'}
          </Typography>
        ) : (
          filteredLogs.map((line, index) => {
            const parsedLog: ParsedLog = parseLogLine(line);
            const type = parsedLog.level;
            const hasJson = !!parsedLog.json;

            return (
              <Accordion
                key={index}
                sx={{
                  bgcolor: 'transparent',
                  boxShadow: 'none',
                  border: 'none',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 },
                  mb: 0.5,
                  borderRadius: '4px !important',
                  '&:not(:last-child)': {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  },
                  '&:first-of-type': {
                    borderTopLeftRadius: '4px',
                    borderTopRightRadius: '4px',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    hasJson ? (
                      <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
                    ) : null
                  }
                  sx={{
                    padding: '6px 8px',
                    minHeight: 'auto',
                    '& .MuiAccordionSummary-content': {
                      margin: 0,
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                    borderRadius: '4px',
                    margin: '2px 0',
                    backgroundColor: 'rgba(30, 30, 30, 0.5)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      width: '100%',
                    }}
                  >
                    <Tooltip title={type} placement="top">
                      <Box
                        sx={{
                          mr: 1,
                          display: 'flex',
                          alignItems: 'center',
                          height: '100%',
                        }}
                      >
                        {getLogIcon(type)}
                      </Box>
                    </Tooltip>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          color: getLevelColor(type),
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          lineHeight: 1.4,
                          display: 'inline',
                          fontFamily: "'Fira Code', 'Courier New', monospace",
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          borderLeft: `2px solid ${getLevelColor(type)}`,
                        }}
                      >
                        {parsedLog.text}
                      </Typography>
                      {hasJson && (
                        <Box
                          component="div"
                          sx={{
                            mt: 0.5,
                            ml: 3,
                            pl: 1,
                            borderLeft: '2px solid',
                            borderLeftColor: 'divider',
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                          }}
                        >
                          {Object.entries(parsedLog.json as Record<string, unknown>)
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <Typography
                                key={key}
                                component="span"
                                sx={{ display: 'block', mb: 0.5 }}
                              >
                                <strong>{key}:</strong>{' '}
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </Typography>
                            ))}
                          {Object.keys(parsedLog.json as Record<string, unknown>).length > 3 && (
                            <Typography
                              component="span"
                              sx={{ fontStyle: 'italic' }}
                            >
                              ... and {Object.keys(parsedLog.json as Record<string, unknown>).length - 3}{' '}
                              more fields
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>

                {hasJson && (
                  <AccordionDetails
                    sx={{
                      padding: '8px 0 0 24px',
                      bgcolor: 'rgba(0,0,0,0.1)',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <Box
                      component="div"
                      sx={{
                        color: '#cbd5e1',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {formatJsonForDisplay(parsedLog.json)}
                    </Box>
                  </AccordionDetails>
                )}
              </Accordion>
            );
          })
        )}
      </Paper>
    </Box>
  );
}

export default Logs;
