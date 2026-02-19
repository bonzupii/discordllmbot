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
  Storage as StorageIcon,
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
  SQL: boolean;
  API: boolean;
  MESSAGE: boolean;
  OTHER: boolean;
}

// Map icon names to components
const iconMap: Record<LogType, React.ComponentType<SvgIconProps>> = {
  ERROR: ErrorIcon,
  WARN: WarningIcon,
  SQL: StorageIcon,
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
    SQL: true,
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

    socket.on('db:log', (line: string) => {
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
    <Box sx={{ width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
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
            label="SQL"
            size="small"
            sx={{
              bgcolor: filters.SQL ? '#ff9800' : 'transparent',
              color: filters.SQL ? 'black' : '#ff9800',
              borderColor: '#ff9800',
              '& .MuiChip-icon': {
                color: filters.SQL ? 'black' : '#ff9800',
              },
              '&:hover': { bgcolor: filters.SQL ? '#f57c00' : 'rgba(255, 152, 0, 0.1)' },
            }}
            variant={filters.SQL ? 'filled' : 'outlined'}
            onClick={() => toggleFilter('SQL')}
            icon={getLogIcon('SQL')}
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
                Auto Scroll
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
        elevation={0}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          fontFamily: "'Google Sans Code', 'Fira Code', 'Courier New', monospace",
          fontSize: '0.75rem',
          height: '100%',
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
            const hasMultiline = parsedLog.text.includes('\n');
            const isExpandable = hasJson || hasMultiline;

            const logContent = (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto auto 1fr',
                  width: '100%',
                  gap: 1,
                  alignItems: 'center',
                  px: 1,
                  py: 0.5,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    color: getLevelColor(type),
                  }}
                >
                  {getLogIcon(type)}
                </Box>
                <Box
                  sx={{
                    fontFamily: "'Google Sans Code', 'Fira Code', 'Courier New', monospace",
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                    color: 'text.secondary',
                  }}
                >
                  {parsedLog.timestamp}
                </Box>
                <Box
                  sx={{
                    fontFamily: "'Google Sans', 'Fira Code', 'Courier New', monospace",
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                    color: getLevelColor(type),
                  }}
                >
                  [{type}]
                </Box>
                <Box
                  sx={{
                    fontFamily: "'Google Sans Code', 'Fira Code', 'Courier New', monospace",
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    lineHeight: 1.4,
                    textAlign: 'right',
                    paddingRight: '15px',
                  }}
                >
                  {parsedLog.text.replace(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[([A-Z]+)\]\s*/, '')}
                </Box>
              </Box>
            );

            if (isExpandable) {
              return (
                <Accordion
                  key={index}
                  sx={{
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': { margin: 0 },
                    borderBottom: '1px solid',
                    borderBottomColor: 'divider',
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
                    }
                    sx={{
                      padding: 0,
                      minHeight: 'auto',
                      '& .MuiAccordionSummary-content': {
                        margin: 0,
                      },
                    }}
                  >
                    {logContent}
                  </AccordionSummary>
                  {hasJson && (
                    <AccordionDetails
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <Box
                        component="div"
                        sx={{
                          fontFamily: "'Google Sans Code', 'Fira Code', 'Courier New', monospace",
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
            }

            return (
              <Box
                key={index}
                sx={{
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderBottomColor: 'divider',
                }}
              >
                {logContent}
              </Box>
            );
          })
        )}
      </Paper>
    </Box>
  );
}

export default Logs;
