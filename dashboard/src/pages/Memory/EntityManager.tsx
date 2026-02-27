/**
 * Entity Manager Component
 * View and manage entities in the hypergraph
 * @module pages/Memory/EntityManager
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
  Stack,
  TextField,
  InputAdornment,
  TablePagination,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import api from '@services/api';

interface Node {
  id: number;
  nodeid: string;
  nodetype: string;
  name: string;
  metadata: Record<string, unknown>;
  createdat: string;
  memorycount: string | number;
}

interface EntityManagerProps {
  guildId: string;
}

export function EntityManager({ guildId }: EntityManagerProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setSortBy] = useState<'name' | 'type' | 'memories'>('memories');

  useEffect(() => {
    if (guildId) {
      loadNodes();
    }
  }, [guildId]);

  const loadNodes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hypergraph/${guildId}/nodes`);
      setNodes(response.data);
    } catch (error) {
      console.error('Failed to load nodes', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.nodeid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.nodetype.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      if (orderBy === 'memories') {
        return Number(b.memorycount) - Number(a.memorycount);
      }
      if (orderBy === 'type') {
        return a.nodetype.localeCompare(b.nodetype);
      }
      return a.name.localeCompare(b.name);
    });
  }, [nodes, searchTerm, orderBy]);

  const paginatedNodes = filteredNodes.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getNodeTypeColor = (nodeType: string): string => {
    const colors: Record<string, string> = {
      user: '#3b82f6',
      channel: '#10b981',
      topic: '#f59e0b',
      emotion: '#ef4444',
      event: '#8b5cf6',
      concept: '#ec4899',
    };
    return colors[nodeType] || '#6b7280';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading entities...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, ID or type..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={orderBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <MenuItem value="memories">Most Memories</MenuItem>
            <MenuItem value="name">Name (A-Z)</MenuItem>
            <MenuItem value="type">Type</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Entity Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Memories</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Internal ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Metadata</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedNodes.map((node) => (
              <TableRow key={node.id} hover>
                <TableCell>
                  <Chip
                    label={node.nodetype}
                    size="small"
                    sx={{ 
                      bgcolor: `${getNodeTypeColor(node.nodetype)}15`,
                      color: getNodeTypeColor(node.nodetype),
                      border: `1px solid ${getNodeTypeColor(node.nodetype)}44`,
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      fontSize: '0.6rem',
                      height: 20
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">{node.name}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={node.memorycount} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontWeight: 'bold', height: 20 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {node.nodeid}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {Object.keys(node.metadata || {}).length > 0 ? (
                    <Tooltip title={JSON.stringify(node.metadata, null, 2)}>
                      <IconButton size="small">
                        <InfoIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredNodes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No entities found matching your search</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredNodes.length}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>
    </Box>
  );
}
