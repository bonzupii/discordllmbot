import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  alpha,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Message as MessageIcon,
  People as PeopleIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Token as TokenIcon,
  ShowChart as ShowChartIcon,
  Storage as StorageIcon,
  Forum as ForumIcon,
} from '@mui/icons-material';
import { rainbowPalettes, chartColors } from '@theme';

import { analyticsApi } from '@services';
import {
  AnalyticsOverview,
  AnalyticsVolume,
  AnalyticsDecisions,
  AnalyticsProviders,
  AnalyticsPerformance,
  AnalyticsUsers,
  AnalyticsChannels,
  AnalyticsErrors,
} from '@types';

interface AnalyticsProps {
  servers?: { id: string; name: string }[];
}

function Analytics({ servers = [] }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState<string>('7');
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [volume, setVolume] = useState<AnalyticsVolume | null>(null);
  const [decisions, setDecisions] = useState<AnalyticsDecisions | null>(null);
  const [providers, setProviders] = useState<AnalyticsProviders | null>(null);
  const [performance, setPerformance] = useState<AnalyticsPerformance | null>(null);
  const [users, setUsers] = useState<AnalyticsUsers | null>(null);
  const [channels, setChannels] = useState<AnalyticsChannels | null>(null);
  const [errors, setErrors] = useState<AnalyticsErrors | null>(null);

  const days = parseInt(timeRange);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, volumeRes, decisionsRes, providersRes, performanceRes, usersRes, channelsRes, errorsRes] =
        await Promise.all([
          analyticsApi.getOverview(days),
          analyticsApi.getVolume(days),
          analyticsApi.getDecisions(days),
          analyticsApi.getProviders(days),
          analyticsApi.getPerformance(days),
          analyticsApi.getUsers(days, selectedServer || undefined, 10),
          analyticsApi.getChannels(days, selectedServer || undefined),
          analyticsApi.getErrors(days, 20),
        ]);
      setOverview(overviewRes.data);
      setVolume(volumeRes.data);
      setDecisions(decisionsRes.data);
      setProviders(providersRes.data);
      setPerformance(performanceRes.data);
      setUsers(usersRes.data);
      setChannels(channelsRes.data);
      setErrors(errorsRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [days, selectedServer]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTimeRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: string) => {
    if (newRange) setTimeRange(newRange);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const palette = rainbowPalettes.palette7;

  const kpiCards = [
    {
      label: 'Total Messages',
      value: formatNumber(overview?.stats?.total_messages || 0),
      icon: <MessageIcon />,
      color: palette[3],
    },
    {
      label: 'Replies Sent',
      value: formatNumber(overview?.stats?.total_replies || 0),
      icon: <CheckCircleIcon />,
      color: palette[2],
    },
    {
      label: 'Reply Rate',
      value: `${overview?.replyRate || 0}%`,
      icon: <TrendingUpIcon />,
      color: palette[4],
    },
    {
      label: 'Tokens Used',
      value: formatNumber((overview?.stats?.total_prompt_tokens || 0) + (overview?.stats?.total_response_tokens || 0)),
      icon: <TokenIcon />,
      color: palette[1],
    },
    {
      label: 'Avg Latency',
      value: formatLatency(overview?.stats?.avg_latency || 0),
      icon: <SpeedIcon />,
      color: palette[0],
    },
    {
      label: 'Active Users',
      value: formatNumber(overview?.stats?.active_users || 0),
      icon: <PeopleIcon />,
      color: palette[5],
    },
    {
      label: 'Error Rate',
      value: `${overview?.errorRate || 0}%`,
      icon: <ErrorIcon />,
      color: overview?.errorRate && overview.errorRate > 5 ? palette[0] : palette[6],
    },
  ];

  const decisionBreakdownData = decisions?.breakdown?.map((d) => ({
    name: d.reason.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: d.count,
  })) || [];

  const funnelData = decisions?.funnel ? [
    { name: 'Messages received', value: Number(decisions.funnel.messages_received) || 0 },
    { name: 'Messages mentioned', value: Number(decisions.funnel.messages_mentioned) || 0 },
    { name: 'Reply attempts', value: Number(decisions.funnel.reply_attempts) || 0 },
    { name: 'Replies sent', value: Number(decisions.funnel.replies_sent) || 0 },
  ] : [];

  const providerData = providers?.byProvider?.map((p) => ({
    name: p.provider,
    model: p.model,
    calls: p.call_count,
    latency: p.avg_latency,
    errors: p.error_count,
    promptTokens: p.prompt_tokens,
    responseTokens: p.response_tokens,
  })) || [];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Analytics
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Server</InputLabel>
            <Select
              value={selectedServer}
              label="Server"
              onChange={(e) => setSelectedServer(e.target.value)}
            >
              <MenuItem value="">All Servers</MenuItem>
              {servers.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            size="small"
          >
            <ToggleButton value="7">7 Days</ToggleButton>
            <ToggleButton value="30">30 Days</ToggleButton>
            <ToggleButton value="90">90 Days</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        {kpiCards.map((kpi, index) => (
          <Paper
            key={index}
            variant="outlined"
            sx={{
              p: 2,
              flex: '1 1 0',
              minWidth: 140,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  p: 0.5,
                  borderRadius: 1,
                  bgcolor: alpha(kpi.color, 0.1),
                  color: kpi.color,
                }}
              >
                {kpi.icon}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                {kpi.label}
              </Typography>
            </Box>
            {loading ? (
              <Skeleton width={80} height={32} />
            ) : (
              <Typography variant="h5" fontWeight="bold" sx={{ color: kpi.color }}>
                {kpi.value}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <ShowChartIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Message volume
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={volume?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="messages" stackId="1" stroke={chartColors.messages} fill={chartColors.messages} name="Messages" />
                  <Area type="monotone" dataKey="replies_sent" stackId="2" stroke={chartColors.repliesSent} fill={chartColors.repliesSent} name="Replies Sent" />
                  <Area type="monotone" dataKey="replies_declined" stackId="3" stroke={chartColors.repliesDeclined} fill={chartColors.repliesDeclined} name="Declined" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Reply decision breakdown
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
            ) : decisionBreakdownData.length === 0 ? (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No reply decisions yet</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={decisionBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {decisionBreakdownData.map((_, index) => (
                      // eslint-disable-next-line @typescript-eslint/no-deprecated
                      <Cell key={`cell-${index}`} fill={rainbowPalettes.palette10[index % rainbowPalettes.palette10.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <TrendingUpIcon sx={{ color: 'info.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Reply funnel
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" />
                  <YAxis type="category" dataKey="name" stroke="#888" width={130} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }} />
                  <Bar dataKey="value" fill={chartColors.repliesSent} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <SpeedIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Latency trend
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="rectangular" height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performance?.latencyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="avg_latency" stroke={chartColors.latency} name="Avg" strokeWidth={2} />
                  <Line type="monotone" dataKey="p95_latency" stroke={palette[0]} name="P95" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <TokenIcon sx={{ color: 'info.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Token usage
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="rectangular" height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={performance?.tokenTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Legend />
                  <Bar dataKey="prompt_tokens" stackId="a" fill={chartColors.messages} name="Prompt" />
                  <Bar dataKey="response_tokens" stackId="a" fill={chartColors.repliesSent} name="Response" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <StorageIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                LLM provider usage
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Provider</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell align="right">Calls</TableCell>
                    <TableCell align="right">Avg latency</TableCell>
                    <TableCell align="right">Prompt</TableCell>
                    <TableCell align="right">Response</TableCell>
                    <TableCell align="right">Errors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    : providerData.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Chip label={p.name} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell>{p.model}</TableCell>
                          <TableCell align="right">{formatNumber(p.calls)}</TableCell>
                          <TableCell align="right">{formatLatency(p.latency)}</TableCell>
                          <TableCell align="right">{formatNumber(p.promptTokens)}</TableCell>
                          <TableCell align="right">{formatNumber(p.responseTokens)}</TableCell>
                          <TableCell align="right">
                            {p.errors > 0 ? (
                              <Chip label={p.errors} size="small" color="error" />
                            ) : (
                              0
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  {!loading && providerData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No provider data yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <PeopleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Top users
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Messages</TableCell>
                    <TableCell align="right">Replies</TableCell>
                    <TableCell align="right">Channels</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    : users?.topUsers.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell>{u.username || u.userId}</TableCell>
                          <TableCell align="right">{formatNumber(u.messages_sent)}</TableCell>
                          <TableCell align="right">{formatNumber(u.replies_received)}</TableCell>
                          <TableCell align="right">{u.channels_used}</TableCell>
                        </TableRow>
                      ))}
                  {!loading && (!users?.topUsers || users.topUsers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No user data yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <ForumIcon sx={{ color: 'success.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Channel activity
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(channels?.channelActivity || []).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" />
                  <YAxis
                    type="category"
                    dataKey="channel_name"
                    stroke="#888"
                    width={100}
                    tickFormatter={(v) => (v ? v.substring(0, 15) : '')}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
                  />
                  <Bar dataKey="messages" fill={chartColors.messages} name="Messages" />
                  <Bar dataKey="replies" fill={chartColors.repliesSent} name="Replies" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Recent errors
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Error Type</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    : errors?.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {new Date(e.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <Chip label={e.provider} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={e.error_type}
                              size="small"
                              color={e.error_type === 'rate_limit' ? 'warning' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {e.message}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!loading && (!errors?.errors || errors.errors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No errors
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Analytics;
