/**
 * Database viewer page for exploring database tables and relationships.
 * @module pages/Database/Database
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
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
  TablePagination,
  Chip,
  Tooltip,
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  useMediaQuery,
} from '@mui/material';
import {
  TableChart as TableIcon,
  Key as KeyIcon,
  Link as LinkIcon,
  ArrowForward as ArrowIcon,
  Info as InfoIcon,
  UnfoldMore as ExpandMoreIcon,
  UnfoldLess as ExpandLessIcon,
  Storage as StorageIcon,
  ListAlt as ListAltIcon,
} from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';

import { databaseApi } from '@services';
import type { TableInfo, TableSchema, TableData, TableRelationship } from '@services';
import { EmptyState } from '@components/common';

/**
 * Renders a value with JSON tree for objects/arrays
 */
function JsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  
  if (value === null) {
    return <Typography component="span" color="text.secondary" fontStyle="italic">null</Typography>;
  }
  
  if (typeof value !== 'object') {
    const isString = typeof value === 'string';
    return (
      <Typography component="span" sx={{ fontFamily: isString ? 'inherit' : 'monospace', color: isString ? 'text.primary' : 'primary.main' }}>
        {typeof value === 'string' ? `"${value}"` : String(value)}
      </Typography>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const isArray = Array.isArray(value);
  
  if (entries.length === 0) {
    return <Typography component="span">{isArray ? '[]' : '{}'}</Typography>;
  }

  const toggleText = expanded 
    ? (isArray ? ']' : '}') 
    : (isArray ? '] ...' : '} ...');
  const expandText = expanded && entries.length > 0 ? '' : '';

  return (
    <Box component="span">
      <Typography 
        component="span" 
        sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { color: 'primary.dark' } }}
        onClick={() => setExpanded(!expanded)}
      >
        {isArray ? '[' : '{'}
        {expandText}
      </Typography>
      {expanded && entries.length > 0 && (
        <Box component="span" sx={{ pl: 1, display: 'inline' }}>
          {entries.map(([key, val], idx) => (
            <Box key={key} sx={{ display: 'block', pl: 2 }}>
              <Typography component="span">
                {!isArray && <span style={{ color: 'rgb(187, 187, 187)', fontWeight: 500 }}>{key}: </span>}
                <JsonValue value={val} depth={depth + 1} />
                {idx < entries.length - 1 && ','}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      <Typography component="span" sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { color: 'primary.dark' } }} onClick={() => setExpanded(!expanded)}>
        {toggleText}
      </Typography>
    </Box>
  );
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function Database() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  // Navigation state
  const [activeSection, setActiveSection] = useState<'info' | 'tables' | 'logs'>('tables');
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [dbStats, setDbStats] = useState<{ tableCount: number; totalRows: number } | null>(null);
  
  // Column state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [currentTableForOrder, setCurrentTableForOrder] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [currentTableForExpanded, setCurrentTableForExpanded] = useState<string>('');
  const [hasExpandableRows, setHasExpandableRows] = useState(false);
  
  const [resizing, setResizing] = useState<{ col: string; startX: number; startWidth: number } | null>(null);
  const [dragging, setDragging] = useState<{ col: string; startX: number } | null>(null);
  const [dbLogs, setDbLogs] = useState<string[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);
  
  const resizingRef = React.useRef(resizing);
  resizingRef.current = resizing;
  
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tablesRes, relsRes] = await Promise.all([
          databaseApi.getTables(),
          databaseApi.getRelationships(),
        ]);
        setTables(tablesRes.data);
        setRelationships(relsRes.data);
        
        let totalRows = 0;
        for (const table of tablesRes.data) {
          try {
            const dataRes = await databaseApi.getTableData(table.table_name, 1, 1);
            totalRows += dataRes.data.pagination.total;
          } catch { /* skip */ }
        }
        setDbStats({ tableCount: tablesRes.data.length, totalRows });
        
        if (tablesRes.data.length > 0) {
          setSelectedTable(tablesRes.data[0].table_name);
        }
      } catch (err) {
        setError('Failed to load database tables');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedTable) return;
    const fetchSchema = async () => {
      try {
        const res = await databaseApi.getTableSchema(selectedTable);
        setSchema(res.data);
        if (currentTableForOrder !== selectedTable) {
          setColumnOrder(res.data.columns.map(c => c.column_name));
          setCurrentTableForOrder(selectedTable);
          setColumnWidths({});
        }
        if (currentTableForExpanded !== selectedTable) {
          setExpandedRows(new Set());
          setCurrentTableForExpanded(selectedTable);
        }
      } catch (err) {
        console.error('Failed to load schema:', err);
      }
    };
    fetchSchema();
  }, [selectedTable, currentTableForOrder, currentTableForExpanded]);

  useEffect(() => {
    if (!selectedTable) return;
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const res = await databaseApi.getTableData(selectedTable, page + 1, rowsPerPage);
        setTableData(res.data);
        
        const calculatedWidths: Record<string, number> = {};
        const columns = schema?.columns || [];
        const data = res.data.data;
        
        columns.forEach((col) => {
          const colName = col.column_name;
          const headerWidth = Math.max(60, Math.min(200, colName.length * 9 + 20));
          let maxDataWidth = 0;
          const sampleSize = Math.min(20, data.length);
          for (let i = 0; i < sampleSize; i++) {
            const value = data[i][colName];
            if (value !== null && value !== undefined) {
              const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
              maxDataWidth = Math.max(maxDataWidth, strVal.length);
            }
          }
          const dataWidth = Math.max(60, Math.min(300, maxDataWidth * 7 + 20));
          calculatedWidths[colName] = Math.max(headerWidth, dataWidth);
        });
        
        setColumnWidths(calculatedWidths);
        
        const hasExpandable = res.data.data.some((row: Record<string, unknown>) => 
          Object.values(row).some(v => v !== null && typeof v === 'object')
        );
        setHasExpandableRows(hasExpandable);
        setExpandedRows(new Set());
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [selectedTable, page, rowsPerPage, schema]);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(0);
    setTabValue(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleResizeStart = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    const width = columnWidths[col] || 150;
    setResizing({ col, startX: e.clientX, startWidth: width });
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    const curr = resizingRef.current;
    if (!curr) return;
    const diff = e.clientX - curr.startX;
    const newWidth = Math.max(50, curr.startWidth + diff);
    setColumnWidths(prev => ({ ...prev, [curr.col]: newWidth }));
  }, []);

  const handleResizeEnd = useCallback(() => setResizing(null), []);

  const handleDragStart = (e: React.DragEvent, col: string) => {
    e.dataTransfer.setData('text/plain', col);
    e.dataTransfer.effectAllowed = 'move';
    setDragging({ col, startX: e.clientX });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const sourceCol = e.dataTransfer.getData('text/plain');
    if (!sourceCol || sourceCol === targetCol) {
      setDragging(null);
      return;
    }
    const fromIndex = columnOrder.indexOf(sourceCol);
    const toIndex = columnOrder.indexOf(targetCol);
    if (fromIndex === -1 || toIndex === -1) return;
    const newOrder = [...columnOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, sourceCol);
    setColumnOrder(newOrder);
    setDragging(null);
  };

  const handleDragEnd = () => setDragging(null);

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const isRowExpanded = (idx: number) => expandedRows.has(idx);

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizing, handleResizeMove, handleResizeEnd]);

  const getRelatedTables = (tableName: string) => {
    return relationships.filter(r => r.from_table === tableName || r.to_table === tableName);
  };

  useEffect(() => {
    if (activeSection !== 'logs') return;

    const socket = io();

    const handleDbLog = (line: string) => {
      setDbLogs(prev => [...prev.slice(-199), line]); // Keep last 200 lines
    };

    socket.on('db:log', handleDbLog);

    return () => {
      socket.off('db:log', handleDbLog);
      socket.disconnect();
    };
  }, [activeSection]);

  useEffect(() => {
    if (dbLogs.length > 0 && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [dbLogs, activeSection]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <EmptyState icon={<InfoIcon />} title="Database Error" message={error} />;
  }

  // Navigation sidebar
  const navSidebar = (
    <List disablePadding>
      <ListItem disablePadding>
        <ListItemButton selected={activeSection === 'info'} onClick={() => setActiveSection('info')} sx={{ borderRadius: 1, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}><InfoIcon color={activeSection === 'info' ? 'primary' : 'inherit'} /></ListItemIcon>
          <ListItemText primary="Info" />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton onClick={() => { setActiveSection('tables'); setTablesExpanded(!tablesExpanded); }} sx={{ borderRadius: 1, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}><StorageIcon /></ListItemIcon>
          <ListItemText primary="Tables" />
          {tablesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
      </ListItem>
      <Collapse in={tablesExpanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {tables.map((table) => (
            <ListItem key={table.table_name} disablePadding>
              <ListItemButton selected={activeSection === 'tables' && selectedTable === table.table_name} onClick={() => { setActiveSection('tables'); handleTableSelect(table.table_name); }} sx={{ borderRadius: 1, mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 28 }}><TableIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={table.table_name} slotProps={{ primary: { fontSize: '0.875rem' } }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
      <ListItem disablePadding>
        <ListItemButton selected={activeSection === 'logs'} onClick={() => setActiveSection('logs')} sx={{ borderRadius: 1, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}><ListAltIcon color={activeSection === 'logs' ? 'primary' : 'inherit'} /></ListItemIcon>
          <ListItemText primary="Logs" />
        </ListItemButton>
      </ListItem>
    </List>
  );

  // Mobile tabs
  const mobileNav = (
    <Tabs value={activeSection} onChange={(_, v) => setActiveSection(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tab value="info" label="Info" icon={<InfoIcon />} iconPosition="start" />
      <Tab value="tables" label="Tables" icon={<StorageIcon />} iconPosition="start" />
      <Tab value="logs" label="Logs" icon={<ListAltIcon />} iconPosition="start" />
    </Tabs>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'info':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>Database Info</Typography>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Statistics</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box><Typography variant="body2" color="text.secondary">Tables</Typography><Typography variant="h6">{dbStats?.tableCount ?? '-'}</Typography></Box>
                  <Box><Typography variant="body2" color="text.secondary">Total Rows</Typography><Typography variant="h6">{dbStats?.totalRows?.toLocaleString() ?? '-'}</Typography></Box>
                </Box>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Tables</Typography>
                {tables.map((table) => (
                  <Box key={table.table_name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{table.table_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{table.column_count} cols</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        );

      case 'logs':
        return (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 1, flexShrink: 0 }}>Database Logs</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, flexShrink: 0 }}>Real-time database query logs from the bot.</Typography>
            <Paper 
              ref={logsRef}
              variant="outlined" 
              sx={{ 
                flex: 1, 
                overflow: 'auto', 
                p: 1, 
                fontFamily: "'Fira Code', 'Courier New', monospace", 
                fontSize: '0.7rem',
                bgcolor: 'background.default'
              }}
            >
              {dbLogs.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
                  Waiting for logs...
                </Typography>
              ) : (
                dbLogs.map((line, idx) => (
                  <Box key={idx} sx={{ py: 0.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography 
                      component="pre" 
                      sx={{ 
                        fontFamily: 'inherit', 
                        fontSize: 'inherit', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-all', 
                        m: 0,
                        color: line.includes('ERROR') ? 'error.main' : line.includes('WARN') ? 'warning.main' : 'text.primary'
                      }}
                    >
                      {line}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Box>
        );

      case 'tables':
      default:
        if (!selectedTable || !schema) {
          return <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Typography color="text.secondary">Select a table from the sidebar</Typography></Box>;
        }
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 2 }}>
              <Typography variant="h5" fontWeight={600}>{selectedTable}</Typography>
              <Chip label={`${tableData?.pagination.total || 0} rows`} size="small" color="primary" variant="outlined" />
            </Box>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2 }}>
              <Tab label="Data" />
              <Tab label="Schema" />
              <Tab label="Relationships" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)', mx: 2 }}>
                {loadingData ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {hasExpandableRows && <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.paper', width: 32 }} />}
                        {columnOrder.map((colName) => {
                          const col = schema.columns.find(c => c.column_name === colName)!;
                          const width = columnWidths[colName] || 150;
                          return (
                            <TableCell key={colName} sx={{ fontWeight: 600, backgroundColor: 'background.paper', width, minWidth: 50 }}>
                              <Box draggable onDragStart={(e) => handleDragStart(e, colName)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, colName)} onDragEnd={handleDragEnd} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: dragging?.col === colName ? 'grabbing' : 'grab' }}>
                                {col.is_primary_key && <Tooltip title="Primary Key"><KeyIcon fontSize="inherit" color="warning" /></Tooltip>}
                                {col.foreign_key && <Tooltip title={`Foreign Key: ${col.foreign_key}`}><LinkIcon fontSize="inherit" color="info" /></Tooltip>}
                                <Box sx={{ flex: 1, cursor: 'grab', userSelect: 'none' }}>{colName}</Box>
                                <Box sx={{ width: 8, height: 16, cursor: 'col-resize', opacity: 0, '&:hover': { opacity: 1 }, ml: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleResizeStart(e, colName); }}><Box sx={{ width: 2, height: 12, bgcolor: 'action.active', borderRadius: 1 }} /></Box>
                              </Box>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData?.data.map((row, idx) => {
                        const isExpanded = isRowExpanded(idx);
                        return (
                          <TableRow key={idx} hover onClick={() => hasExpandableRows && toggleRow(idx)} sx={{ cursor: hasExpandableRows ? 'pointer' : 'default' }}>
                            {hasExpandableRows && <TableCell sx={{ width: 32, p: 0.5 }}>{isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</TableCell>}
                            {columnOrder.map((colName) => {
                              const width = columnWidths[colName] || 150;
                              const value = row[colName];
                              const isObject = value !== null && typeof value === 'object';
                              const needsExpand = isObject && !isExpanded;
                              return (
                                <TableCell key={colName} sx={{ width, minWidth: 50, maxWidth: width, verticalAlign: 'top' }}>
                                  {value === null ? <Typography variant="body2" color="text.secondary" fontStyle="italic">NULL</Typography> : typeof value === 'object' ? <Box sx={{ fontSize: '0.75rem' }}>{needsExpand ? <Typography variant="body2" color="text.secondary">Click to expand</Typography> : <JsonValue value={value} />}</Box> : String(value)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
              <TablePagination component="div" count={tableData?.pagination.total || 0} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 20, 50, 100]} sx={{ px: 2 }} />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <TableContainer component={Paper} sx={{ mx: 2 }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ fontWeight: 600 }}>Column</TableCell><TableCell sx={{ fontWeight: 600 }}>Type</TableCell><TableCell sx={{ fontWeight: 600 }}>Nullable</TableCell><TableCell sx={{ fontWeight: 600 }}>Key</TableCell></TableRow></TableHead>
                  <TableBody>
                    {schema.columns.map((col) => (
                      <TableRow key={col.column_name} hover>
                        <TableCell sx={{ fontWeight: 500 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{col.is_primary_key && <KeyIcon color="warning" fontSize="small" />}{col.foreign_key && !col.is_primary_key && <LinkIcon color="info" fontSize="small" />}{col.column_name}</Box></TableCell>
                        <TableCell><Chip label={col.data_type} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} /></TableCell>
                        <TableCell>{col.is_nullable === 'YES' ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{col.is_primary_key && <Chip label="PK" size="small" color="warning" />}{col.foreign_key && !col.is_primary_key && <Tooltip title={`References ${schema.foreignKeys[col.column_name]?.table}.${schema.foreignKeys[col.column_name]?.column}`}><Chip label="FK" size="small" color="info" /></Tooltip>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ px: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Foreign key relationships involving this table</Typography>
                {getRelatedTables(selectedTable).length === 0 ? <EmptyState icon={<LinkIcon />} title="No Relationships" message="This table has no foreign key relationships" /> : getRelatedTables(selectedTable).map((rel, idx) => (
                  <Card key={idx} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={rel.from_table} size="small" color={rel.from_table === selectedTable ? 'primary' : 'default'} variant={rel.from_table === selectedTable ? 'filled' : 'outlined'} />
                        <ArrowIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontFamily="monospace">{rel.from_column}</Typography>
                        <LinkIcon fontSize="small" color="action" />
                        <Chip label={rel.to_table} size="small" color={rel.to_table === selectedTable ? 'primary' : 'default'} variant={rel.to_table === selectedTable ? 'filled' : 'outlined'} />
                        <Typography variant="body2" fontFamily="monospace">{rel.to_column}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </TabPanel>
          </>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'auto', overflow: 'hidden' }}>
      {isMobile && mobileNav}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isMobile && (
          <Paper sx={{ width: 260, flexShrink: 0, overflow: 'hidden', mr: 2, ml: 2, mt: 2, mb: 2, borderRadius: 1 }}>
            <Box sx={{ p: 2 }}>{navSidebar}</Box>
          </Paper>
        )}
        {isMobile && activeSection === 'tables' && (
          <Paper sx={{ width: 200, flexShrink: 0, overflow: 'auto', mr: 1, ml: 1, mt: 1, mb: 1, borderRadius: 1 }}>
            <Box sx={{ p: 1 }}>
              <List disablePadding>{tables.map((table) => (<ListItem key={table.table_name} disablePadding><ListItemButton selected={selectedTable === table.table_name} onClick={() => handleTableSelect(table.table_name)} sx={{ borderRadius: 1, mb: 0.5 }}><ListItemIcon sx={{ minWidth: 28 }}><TableIcon fontSize="small" /></ListItemIcon><ListItemText primary={table.table_name} slotProps={{ primary: { fontSize: '0.875rem' } }} /></ListItemButton></ListItem>))}</List>
            </Box>
          </Paper>
        )}
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', mr: 2, ml: 2, mt: 2, mb: 2 }}>
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}
