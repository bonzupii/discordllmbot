/**
 * Entity Manager Component
 * View and manage entities in the hypergraph
 * @module pages/Memory/EntityManager
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
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
} from '@mui/material';
import api from '@services/api';

interface Node {
  id: number;
  nodeid: string;
  nodetype: string;
  name: string;
  metadata: Record<string, unknown>;
}

interface EntityManagerProps {
  guildId: string;
}

export function EntityManager({ guildId }: EntityManagerProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

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

  const nodesByType = nodes.reduce((acc, node) => {
    if (!acc[node.nodetype]) acc[node.nodetype] = [];
    acc[node.nodetype].push(node);
    return acc;
  }, {} as Record<string, Node[]>);

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
      <Grid container spacing={2}>
        {Object.entries(nodesByType).map(([type, typeNodes]) => (
          <Grid item xs={12} md={6} key={type}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: getNodeTypeColor(type),
                  }}
                />
                <Typography variant="h6">
                  {type.charAt(0).toUpperCase() + type.slice(1)}s ({typeNodes.length})
                </Typography>
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Node ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {typeNodes.slice(0, 10).map((node) => (
                      <TableRow key={node.id}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2">{node.name}</Typography>
                            {node.nodetype === 'topic' && (
                              <Chip label={node.nodetype} size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                            {node.nodeid.slice(0, 8)}...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {typeNodes.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          <Typography variant="caption" color="text.secondary">
                            +{typeNodes.length - 10} more...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        ))}

        {Object.keys(nodesByType).length === 0 && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No entities found</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
