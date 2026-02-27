/**
 * Memory Browser Component
 * Browse and search through stored memories
 * @module pages/Memory/MemoryBrowser
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Pagination,
  Typography,
  Paper,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import api from '@services/api';

interface Memory {
  id: number;
  edgetype: string;
  summary: string;
  content?: string;
  urgency: number;
  members?: Array<{
    nodetype: string;
    name: string;
    role: string;
  }>;
}

interface MemoryBrowserProps {
  guildId: string;
  channelId: string;
}

export function MemoryBrowser({ guildId, channelId }: MemoryBrowserProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const memoriesPerPage = 20;

  useEffect(() => {
    if (guildId && channelId) {
      loadMemories();
    }
  }, [guildId, channelId, page]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hypergraph/${guildId}/memories`, {
        params: { channelId, minUrgency: 0, limit: 100 }
      });
      setMemories(response.data);
    } catch (error) {
      console.error('Failed to load memories', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter(m =>
    m.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedMemories = filteredMemories.slice(
    (page - 1) * memoriesPerPage,
    page * memoriesPerPage
  );

  const getEdgeTypeColor = (edgeType: string): 'primary' | 'success' | 'info' | 'warning' | 'default' => {
    const colors: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'default'> = {
      conversation: 'primary',
      fact: 'success',
      observation: 'info',
      relationship: 'warning',
    };
    return colors[edgeType] || 'default';
  };

  return (
    <Box>
      <TextField
        fullWidth
        label="Search memories..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setPage(1);
        }}
        sx={{ mb: 2 }}
        size="small"
      />

      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Loading memories...</Typography>
        </Box>
      ) : filteredMemories.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No memories found</Typography>
        </Box>
      ) : (
        <>
          <List>
            {paginatedMemories.map((memory) => (
              <MemoryListItem
                key={memory.id}
                memory={memory}
                expanded={expandedId === memory.id}
                onToggle={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                getEdgeTypeColor={getEdgeTypeColor}
              />
            ))}
          </List>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={Math.ceil(filteredMemories.length / memoriesPerPage)}
              page={page}
              onChange={(_e, value) => setPage(value)}
              size="small"
            />
          </Box>
        </>
      )}
    </Box>
  );
}

interface MemoryListItemProps {
  memory: Memory;
  expanded: boolean;
  onToggle: () => void;
  getEdgeTypeColor: (type: string) => 'primary' | 'success' | 'info' | 'warning' | 'default';
}

function MemoryListItem({ memory, expanded, onToggle, getEdgeTypeColor }: MemoryListItemProps) {
  return (
    <ListItem
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
            <Chip label={memory.edgetype} color={getEdgeTypeColor(memory.edgetype)} size="small" />
            <Chip label={`Urgency: ${memory.urgency?.toFixed(2)}`} size="small" variant="outlined" />
            <Chip label={`ID: ${memory.id}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          </Stack>

          <Typography variant="body1" fontWeight="medium">
            {memory.summary}
          </Typography>
        </Box>

        <IconButton size="small" onClick={onToggle}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 1, width: '100%' }}>
          {memory.content && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1, fontStyle: 'italic' }}>
              "{memory.content}"
            </Typography>
          )}

          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {memory.members?.map((member, idx) => (
              <Chip
                key={idx}
                label={`${member.nodetype}: ${member.name}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Stack>
        </Box>
      </Collapse>
    </ListItem>
  );
}
